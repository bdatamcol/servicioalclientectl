import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { 
  getUserPermissions, 
  canViewResponses, 
  createSecurityContext, 
  logSecurityEvent,
  checkRateLimit,
  sanitizeInput 
} from '@/lib/auth/permissions'

// Tipos
interface ResponsesQueryParams {
  pqrs_id: string | null
  page: string
  limit: string
  search: string
  status: string
  date_from: string
  date_to: string
}

interface ResponseItem {
  id: string
  pqrs_id: string
  responder_email?: string | null
  responder_name?: string | null
  subject?: string
  content: string
  status?: string
  sent_at?: string | null
  created_at: string
  error_message?: string | null
  retry_count?: number | null
  has_attachments?: boolean
  attachment_count?: number
  content_preview?: string
  content_length?: number
}

interface ResponsesQueryResult {
  responses: ResponseItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: {
    total: number
    sent: number
    failed: number
    pending: number
  }
  filters: {
    search: string
    status: string
    date_from: string
    date_to: string
  }
}

// Define shape of DB row from pqrs_responses
type DbResponseRow = {
  id: string
  pqrs_id: string
  sent_by?: string | null
  email_subject?: string | null
  response_text?: string | null
  status?: string | null
  sent_at?: string | null
  created_at: string
  error_message?: string | null
  retry_count?: number | null
  attachment_count?: number | null
}

// Cache en memoria para consultas frecuentes
const cache = new Map<string, { data: ResponsesQueryResult; timestamp: number; ttl: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function getCacheKey(params: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key]
      return result
    }, {} as Record<string, string>)
  
  return JSON.stringify(sortedParams)
}

function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, value] of cache.entries()) {
    if (now > value.timestamp + value.ttl) {
      cache.delete(key)
    }
  }
}

export async function GET(request: NextRequest) {
  let securityContext
  
  try {
    // Crear contexto de seguridad
    securityContext = await createSecurityContext(request)
    
    // Verificar rate limiting
    const rateLimitOk = await checkRateLimit(securityContext.userId, 'view_responses', 60, 100)
    if (!rateLimitOk) {
      await logSecurityEvent(securityContext, 'view_responses', 'rate_limit_exceeded', false)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intente más tarde.' },
        { status: 429 }
      )
    }

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(securityContext.userId)
    
    // Verificar permisos para ver respuestas
    if (!canViewResponses(permissions)) {
      await logSecurityEvent(securityContext, 'view_responses', 'permission_denied', false)
      return NextResponse.json(
        { error: 'No tiene permisos para ver respuestas' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Sanitizar parámetros de entrada
    const rawParams: ResponsesQueryParams = {
      pqrs_id: searchParams.get('pqrs_id'),
      page: (searchParams.get('page') || '1'),
      limit: (searchParams.get('limit') || '10'),
      search: (searchParams.get('search') || ''),
      status: (searchParams.get('status') || ''),
      date_from: (searchParams.get('date_from') || ''),
      date_to: (searchParams.get('date_to') || '')
    }
    
    const params = sanitizeInput(rawParams)
    
    // Validar parámetros requeridos
    if (!params.pqrs_id) {
      await logSecurityEvent(securityContext, 'view_responses', 'invalid_params', false, { params })
      return NextResponse.json(
        { error: 'ID del PQRS es requerido' },
        { status: 400 }
      )
    }

    // Verificar acceso al PQRS específico
    const { canAccessPqrs } = await import('@/lib/auth/permissions')
    const hasAccess = await canAccessPqrs(params.pqrs_id, permissions)
    
    if (!hasAccess) {
      await logSecurityEvent(securityContext, 'view_responses', 'access_denied', false, { pqrs_id: params.pqrs_id })
      return NextResponse.json(
        { error: 'No tiene acceso a este PQRS' },
        { status: 403 }
      )
    }

    // Limpiar cache expirado
    cleanExpiredCache()
    
    // Verificar cache
    const cacheKey = getCacheKey({
      pqrs_id: params.pqrs_id,
      page: params.page,
      limit: params.limit,
      search: params.search,
      status: params.status,
      date_from: params.date_from,
      date_to: params.date_to
    })
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      await logSecurityEvent(securityContext, 'view_responses', 'cache_hit', true, { pqrs_id: params.pqrs_id })
      return NextResponse.json(cached.data)
    }

    const page = Math.max(1, parseInt(params.page))
    const limit = Math.min(50, Math.max(1, parseInt(params.limit))) // Máximo 50 por página
    const offset = (page - 1) * limit

    // Construir query optimizada usando la tabla directamente
    let query = supabase
      .from('pqrs_responses')
      .select(`
        id,
        pqrs_id,
        sent_by,
        email_subject,
        response_text,
        status,
        sent_at,
        created_at,
        attachment_count,
        error_message,
        retry_count
      `)
      .eq('pqrs_id', params.pqrs_id)

    // Aplicar filtros de seguridad adicionales
    if (!permissions.canViewAllPqrs) {
      // Filtrar por empresas/sucursales permitidas si no es admin
      if (permissions.allowedCompanies.length > 0) {
        // Necesitamos hacer join con la tabla pqrs para filtrar por company_id
        query = supabase
          .from('pqrs_responses')
          .select(`
            *,
            pqrs!inner(company_id, branch_id)
          `)
          .eq('pqrs_id', params.pqrs_id)
          .in('pqrs.company_id', permissions.allowedCompanies)
      }
      
      if (permissions.allowedBranches.length > 0) {
        query = query.in('pqrs.branch_id', permissions.allowedBranches)
      }
    }

    // Aplicar filtros de búsqueda
    if (params.search) {
      query = query.or(`email_subject.ilike.%${params.search}%,response_text.ilike.%${params.search}%`)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.date_from) {
      query = query.gte('created_at', params.date_from)
    }

    if (params.date_to) {
      query = query.lte('created_at', params.date_to)
    }

    // Obtener total de registros para paginación
    const countQuery = supabase
      .from('pqrs_responses')
      .select('*', { count: 'exact', head: true })
      .eq('pqrs_id', params.pqrs_id)
    
    // Aplicar los mismos filtros de seguridad al conteo
    if (!permissions.canViewAllPqrs) {
      if (permissions.allowedCompanies.length > 0) {
        countQuery.select(`
          *,
          pqrs!inner(company_id, branch_id)
        `).in('pqrs.company_id', permissions.allowedCompanies)
      }
      
      if (permissions.allowedBranches.length > 0) {
        countQuery.in('pqrs.branch_id', permissions.allowedBranches)
      }
    }
    
    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error al contar respuestas:', countError)
      await logSecurityEvent(securityContext, 'view_responses', 'count_error', false, { error: countError.message })
      return NextResponse.json(
        { error: 'Error al obtener el total de respuestas' },
        { status: 500 }
      )
    }

    // Obtener datos paginados
    const { data: responses, error: dataError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (dataError) {
      console.error('Error al obtener respuestas:', dataError)
      await logSecurityEvent(securityContext, 'view_responses', 'data_error', false, { error: dataError.message })
      return NextResponse.json(
        { error: 'Error al obtener las respuestas' },
        { status: 500 }
      )
    }

    // Obtener estadísticas de resumen
    const { data: summaryData, error: summaryError } = await supabase
      .from('pqrs_responses')
      .select('status')
      .eq('pqrs_id', params.pqrs_id)

    let summary: { total: number; sent: number; failed: number; pending: number } = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0
    }

    if (!summaryError && summaryData) {
      summary = summaryData.reduce((acc, item) => {
        acc.total++
        switch (item.status) {
          case 'sent':
            acc.sent++
            break
          case 'failed':
            acc.failed++
            break
          case 'pending':
            acc.pending++
            break
        }
        return acc
      }, summary)
    }

    // Procesar respuestas para agregar campos calculados y mapear nombres
    const processedResponses: ResponseItem[] = (responses ?? []).map((response: DbResponseRow) => ({
      id: response.id,
      pqrs_id: response.pqrs_id,
      responder_email: response.sent_by,
      responder_name: response.sent_by,
      subject: response.email_subject || undefined,
      content: response.response_text || '',
      status: response.status || undefined,
      sent_at: response.sent_at || null,
      created_at: response.created_at,
      error_message: response.error_message || null,
      retry_count: response.retry_count ?? null,
      has_attachments: (response.attachment_count ?? 0) > 0,
      attachment_count: response.attachment_count ?? 0,
      content_preview: response.response_text ? response.response_text.substring(0, 100) + '...' : '',
      content_length: response.response_text ? response.response_text.length : 0
    }))

    const result: ResponsesQueryResult = {
      responses: processedResponses,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit),
        hasNext: page < Math.ceil((totalCount || 0) / limit),
        hasPrev: page > 1
      },
      summary,
      filters: {
        search: params.search,
        status: params.status,
        date_from: params.date_from,
        date_to: params.date_to
      }
    }

    // Guardar en cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: CACHE_TTL
    })

    // Registrar evento exitoso
    await logSecurityEvent(securityContext, 'view_responses', 'success', true, { 
      pqrs_id: params.pqrs_id,
      results_count: processedResponses.length 
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error en API de consulta de respuestas:', error)
    
    if (securityContext) {
      await logSecurityEvent(securityContext, 'view_responses', 'system_error', false, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Endpoint para limpiar cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'clear_cache') {
      cache.clear()
      return NextResponse.json({
        ok: true,
        message: 'Cache limpiado exitosamente'
      })
    }

    return NextResponse.json({
      ok: false,
      error: 'Acción no válida'
    }, { status: 400 })

  } catch (error) {
    console.error('Error al limpiar cache:', error)
    return NextResponse.json({
      ok: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}