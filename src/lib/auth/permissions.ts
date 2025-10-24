// Validaciones de seguridad y permisos para el sistema PQRS
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface UserPermissions {
  canViewResponses: boolean
  canSendResponses: boolean
  canViewAllPqrs: boolean
  canManageSystem: boolean
  allowedCompanies: string[]
  allowedBranches: string[]
}

export interface SecurityContext {
  userId: string
  userEmail: string
  userRole: string
  ipAddress: string
  userAgent: string
  sessionId: string
}

// Roles del sistema
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager', 
  OPERATOR: 'operator',
  VIEWER: 'viewer'
} as const

// Permisos por rol
const ROLE_PERMISSIONS: Record<string, Partial<UserPermissions>> = {
  [USER_ROLES.ADMIN]: {
    canViewResponses: true,
    canSendResponses: true,
    canViewAllPqrs: true,
    canManageSystem: true
  },
  [USER_ROLES.MANAGER]: {
    canViewResponses: true,
    canSendResponses: true,
    canViewAllPqrs: true,
    canManageSystem: false
  },
  [USER_ROLES.OPERATOR]: {
    canViewResponses: true,
    canSendResponses: true,
    canViewAllPqrs: false,
    canManageSystem: false
  },
  [USER_ROLES.VIEWER]: {
    canViewResponses: true,
    canSendResponses: false,
    canViewAllPqrs: false,
    canManageSystem: false
  }
}

/**
 * Obtiene los permisos del usuario basado en su rol y asignaciones
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  try {
    // Si es el usuario del sistema, dar permisos completos
    if (userId === 'system-user') {
      return {
        canViewResponses: true,
        canSendResponses: true,
        canViewAllPqrs: true,
        canManageSystem: true,
        allowedCompanies: [],
        allowedBranches: []
      }
    }

    // Para usuarios reales, obtener información desde Supabase
    // Por ahora, dar permisos de administrador por defecto para desarrollo
    const userRole = USER_ROLES.ADMIN
    const allowedCompanies: string[] = []
    const allowedBranches: string[] = []

    // Obtener permisos base del rol
    const basePermissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[USER_ROLES.ADMIN]

    return {
      ...basePermissions,
      allowedCompanies,
      allowedBranches
    } as UserPermissions

  } catch (error) {
    console.error('Error al obtener permisos del usuario:', error)
    // Retornar permisos de administrador en caso de error para desarrollo
    return {
      canViewResponses: true,
      canSendResponses: true,
      canViewAllPqrs: true,
      canManageSystem: true,
      allowedCompanies: [],
      allowedBranches: []
    }
  }
}

/**
 * Valida si el usuario puede acceder a un PQRS específico
 */
export async function canAccessPqrs(pqrsId: string, permissions: UserPermissions): Promise<boolean> {
  try {
    // Si puede ver todos los PQRS, permitir acceso
    if (permissions.canViewAllPqrs) {
      return true
    }

    // Obtener información del PQRS
    const { data: pqrs, error } = await supabaseAdmin
      .from('pqrs')
      .select('company_id, branch_id')
      .eq('id', pqrsId)
      .single()

    if (error || !pqrs) {
      return false
    }

    // Verificar si el usuario tiene acceso a la empresa/sucursal
    const hasCompanyAccess = permissions.allowedCompanies.length === 0 || 
                            permissions.allowedCompanies.includes(pqrs.company_id)
    
    const hasBranchAccess = permissions.allowedBranches.length === 0 || 
                           permissions.allowedBranches.includes(pqrs.branch_id)

    return hasCompanyAccess && hasBranchAccess

  } catch (error) {
    console.error('Error al validar acceso al PQRS:', error)
    return false
  }
}

/**
 * Valida si el usuario puede enviar respuestas
 */
export function canSendResponse(permissions: UserPermissions): boolean {
  return permissions.canSendResponses
}

/**
 * Valida si el usuario puede ver respuestas
 */
export function canViewResponses(permissions: UserPermissions): boolean {
  return permissions.canViewResponses
}

/**
 * Crea el contexto de seguridad para auditoría
 */
export async function createSecurityContext(request: Request): Promise<SecurityContext> {
  try {
    // Obtener el token de autorización del header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      // Si no hay token, usar contexto por defecto con permisos de administrador para desarrollo
      const forwarded = request.headers.get('x-forwarded-for')
      const ipAddress = forwarded ? forwarded.split(',')[0] : 
                       request.headers.get('x-real-ip') || 
                       'unknown'
      
      return {
        userId: 'system-user',
        userEmail: 'system@backcenter.com',
        userRole: USER_ROLES.ADMIN,
        ipAddress,
        userAgent: request.headers.get('user-agent') || 'unknown',
        sessionId: Date.now().toString()
      }
    }

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      throw new Error('Token inválido')
    }

    // Obtener IP del cliente
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    return {
      userId: user.id,
      userEmail: user.email || 'unknown@backcenter.com',
      userRole: user.user_metadata?.role || USER_ROLES.ADMIN, // Por defecto admin para desarrollo
      ipAddress,
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: user.id + '-' + Date.now().toString()
    }
  } catch (error) {
    console.error('Error al crear contexto de seguridad:', error)
    
    // En caso de error, usar contexto por defecto con permisos de administrador
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0] : 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    return {
      userId: 'system-user',
      userEmail: 'system@backcenter.com',
      userRole: USER_ROLES.ADMIN,
      ipAddress,
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: Date.now().toString()
    }
  }
}

/**
 * Registra actividad de seguridad para auditoría
 */
export async function logSecurityEvent(
  context: SecurityContext,
  action: string,
  resource: string,
  success: boolean,
  details?: unknown
) {
  try {
    await supabaseAdmin
      .from('security_audit_log')
      .insert({
        user_id: context.userId,
        user_email: context.userEmail,
        user_role: context.userRole,
        action,
        resource,
        success,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        session_id: context.sessionId,
        details: details ? JSON.stringify(details) : null,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error al registrar evento de seguridad:', error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

/**
 * Valida límites de rate limiting
 */
export async function checkRateLimit(
  userId: string, 
  action: string, 
  windowMinutes: number = 60, 
  maxRequests: number = 100
): Promise<boolean> {
  try {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
    
    const { count, error } = await supabaseAdmin
      .from('security_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('action', action)
      .gte('created_at', windowStart)

    if (error) {
      console.error('Error al verificar rate limit:', error)
      return true // Permitir en caso de error
    }

    return (count || 0) < maxRequests

  } catch (error) {
    console.error('Error en rate limiting:', error)
    return true // Permitir en caso de error
  }
}

/**
 * Sanitiza datos de entrada para prevenir inyecciones
 */
export function sanitizeInput<T>(input: T): T {
  if (typeof input === 'string') {
    return (input as string)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim() as unknown as T
  }
  
  if (Array.isArray(input)) {
    return (input as unknown[]).map(sanitizeInput) as unknown as T
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized as unknown as T
  }
  
  return input
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida que el contenido no contenga elementos maliciosos
 */
export function validateContent(content: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Verificar longitud
  if (content.length > 50000) {
    errors.push('El contenido excede el límite máximo de caracteres')
  }
  
  // Verificar scripts maliciosos
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(content)) {
    errors.push('El contenido contiene scripts no permitidos')
  }
  
  // Verificar enlaces sospechosos
  if (/javascript:/gi.test(content)) {
    errors.push('El contenido contiene enlaces javascript no permitidos')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}