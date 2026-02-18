import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import nodemailer from 'nodemailer';

export const runtime = "nodejs";

// Configuración del transporter de nodemailer
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

interface ResponsePostBody {
  to_email: string;
  pqrs_id: string;
  content: string;
  responder_email: string;
  subject?: string;
  cc_emails?: string;
  bcc_emails?: string;
  attachment?: File;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    console.log("Iniciando GET /api/pqrs/responses");
    
    const { searchParams } = new URL(req.url);
    const pqrsIdParam = searchParams.get("pqrsId");
    const idsParam = searchParams.get("ids");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    
    console.log("Parámetros recibidos:", { pqrsIdParam, idsParam, page, pageSize });

    let query = getSupabaseAdmin()
      .from("pqrs_responses")
      .select("*")
      .order("created_at", { ascending: false });

    if (pqrsIdParam) {
      console.log("Filtrando por pqrsId:", pqrsIdParam);
      query = query.eq("pqrs_id", pqrsIdParam);
    } else if (idsParam) {
      console.log("Filtrando por lista de ids:", idsParam);
      const ids = idsParam.split(",").map(id => id.trim());
      console.log("IDs parseados:", ids);
      query = query.in("pqrs_id", ids);
    }

    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    console.log("Ejecutando consulta...");
    const { data, error, count } = await query;

    if (error) {
      console.error("Error en consulta Supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("Consulta exitosa, datos obtenidos:", data?.length || 0);

    // Si se solicitan múltiples IDs, devolver un mapa de estados para el dashboard
    if (idsParam) {
      const statuses: Record<string, string> = {}
      for (const row of (data ?? [] as Array<{ pqrs_id?: string }>)) {
        if (row.pqrs_id) {
          statuses[row.pqrs_id] = 'Respondido'
        }
      }
      return NextResponse.json({ ok: true, data: statuses })
    }

    // Respuesta estándar con paginación para vistas de detalle
    return NextResponse.json({
      ok: true,
      data: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    });

  } catch (e: unknown) {
    console.error("Error en GET /api/pqrs/responses:", e);
    const message = e instanceof Error ? e.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Iniciando POST /api/pqrs/responses");
    
    // Verificar si es FormData (con archivos adjuntos) o JSON
    const contentType = req.headers.get('content-type') || '';
    let body: ResponsePostBody;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = {
        to_email: formData.get('to_email') as string,
        pqrs_id: formData.get('pqrs_id') as string,
        content: formData.get('content') as string,
        responder_email: formData.get('responder_email') as string,
        subject: (formData.get('subject') as string) || `Respuesta a su PQRS`,
        cc_emails: formData.get('cc_emails') as string,
        bcc_emails: formData.get('bcc_emails') as string,
        attachment: formData.get('attachment') as File
      };
    } else {
      const json = await req.json();
      body = {
        to_email: json.to_email,
        pqrs_id: json.pqrs_id,
        content: json.content,
        responder_email: json.responder_email,
        subject: json.subject ?? `Respuesta a su PQRS`,
        cc_emails: json.cc_emails,
        bcc_emails: json.bcc_emails,
        // En JSON no manejamos adjunto directamente
      } as ResponsePostBody;
    }
    
    console.log("Datos recibidos:", { ...body, attachment: body.attachment ? 'archivo presente' : 'sin archivo' });
    
    // Validaciones básicas
    if (!body.to_email || !body.pqrs_id || !body.content || !body.responder_email) {
      return NextResponse.json({
        ok: false,
        error: "Faltan campos obligatorios: to_email, pqrs_id, content, responder_email"
      }, { status: 400 });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.to_email)) {
      return NextResponse.json({
        ok: false,
        error: "Formato de email inválido"
      }, { status: 400 });
    }
    
    try {
      // Crear transporter
      const transporter = createTransporter();
      
      // Configurar el correo
      const mailOptions: nodemailer.SendMailOptions = {
        from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM}>`,
        replyTo: 'contactsac@hph.com.co',
        to: body.to_email,
        subject: body.subject,
        text: body.content,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h3>Respuesta a su PQRS</h3>
          <p>${body.content.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Este correo fue enviado desde el sistema PQRS de BDATAM Digital.<br>
            Respondido por: ${body.responder_email}
          </p>
        </div>`
      };
      
      // Agregar CC y BCC si existen
      if (body.cc_emails) {
        mailOptions.cc = body.cc_emails;
      }
      if (body.bcc_emails) {
        mailOptions.bcc = body.bcc_emails;
      }
      
      // Manejar archivo adjunto si existe
      if (body.attachment && body.attachment instanceof File) {
        const buffer = Buffer.from(await body.attachment.arrayBuffer());
        mailOptions.attachments = [{
          filename: body.attachment.name,
          content: buffer
        }];
      }
      
      console.log("Enviando correo...");
      const info = await transporter.sendMail(mailOptions);
      console.log("Correo enviado exitosamente:", info.messageId);
      
      const nowIso = new Date().toISOString();
      const responseData = {
        pqrs_id: body.pqrs_id,
        response_text: body.content,
        response_type: 'email',
        status: 'sent',
        sent_at: nowIso,
        sent_by: body.responder_email,
        email_subject: body.subject || null
      };
      
      const { data: dbData, error: dbError } = await getSupabaseAdmin()
        .from("pqrs_responses")
        .insert(responseData)
        .select()
        .single();
      
      if (dbError) {
        console.error("Error guardando en BD:", dbError);
        // El correo se envió pero no se pudo guardar en BD
        return NextResponse.json({
          ok: true,
          data: {
            status: 'sent',
            message: 'Correo enviado exitosamente (advertencia: no se pudo guardar en BD)',
            messageId: info.messageId
          }
        });
      }
      
      return NextResponse.json({
        ok: true,
        data: {
          status: 'sent',
          message: 'Correo enviado y registrado exitosamente',
          messageId: info.messageId,
          id: dbData.id
        }
      });
      
    } catch (emailError: unknown) {
      console.error("Error enviando correo:", emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Error al enviar el correo';
      
      const errorData = {
        pqrs_id: body.pqrs_id,
        response_text: body.content,
        response_type: 'email',
        status: 'failed',
        sent_by: body.responder_email,
        email_subject: body.subject || null
      };
      
      await getSupabaseAdmin()
        .from('pqrs_responses')
        .insert(errorData);
      
      return NextResponse.json({
        ok: false,
        data: {
          status: 'failed',
          error_message: errorMessage
        },
        error: "Error al enviar el correo"
      }, { status: 500 });
    }
    
  } catch (e: unknown) {
    console.error("Error en POST /api/pqrs/responses:", e);
    const message = e instanceof Error ? e.message : "Error interno del servidor";
    return NextResponse.json({ 
      ok: false,
      error: message 
    }, { status: 500 });
  }
}
