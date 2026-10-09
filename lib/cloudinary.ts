import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

function required(name: 'CLOUDINARY_CLOUD_NAME' | 'CLOUDINARY_API_KEY' | 'CLOUDINARY_API_SECRET'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thiếu biến môi trường ${name}.`);
  return value;
}

export function getCloudinary() {
  cloudinary.config({
    cloud_name: required('CLOUDINARY_CLOUD_NAME'),
    api_key: required('CLOUDINARY_API_KEY'),
    api_secret: required('CLOUDINARY_API_SECRET'),
    secure: true,
  });
  return cloudinary;
}

export function cloudinaryEvidenceUrl(publicId: string): string {
  return getCloudinary().url(publicId, {
    type: 'authenticated',
    sign_url: true,
    secure: true,
  });
}
