import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "Archivo requerido" }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "Tipo de archivo no válido. Solo se permiten imágenes PNG, JPG, JPEG, WEBP y GIF." }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ ok: false, error: "El archivo es demasiado grande. Máximo 5MB." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${unique}.${fileExt}`;
    const filePath = `logos/${filename}`;

    // Subir archivo a Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      return NextResponse.json({ ok: false, error: "Error al subir archivo a almacenamiento" }, { status: 500 });
    }

    // Obtener URL pública del archivo
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(filePath);

    const url = publicUrlData.publicUrl;
    return NextResponse.json({ ok: true, url });
  } catch (e: unknown) {
    console.error('Upload error:', e);
    const message = e instanceof Error ? e.message : "Error al subir archivo";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}