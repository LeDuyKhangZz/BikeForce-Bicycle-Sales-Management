import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { parsePageParam } from '@/lib/reports/pagination';
import { getSessionProfile } from '@/services/profiles';
import {
  searchSaleWorkZaloCustomerDialog,
  type SaleWorkZaloCustomerCategoryFilter,
} from '@/services/salework-zalo-customers';

const VALID_CATEGORIES = new Set<SaleWorkZaloCustomerCategoryFilter>(['all', 'friends', 'directory', 'requests']);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Vui lòng đăng nhập lại.' }, { status: 401 });

  const profile = await getSessionProfile(supabase, user.id);
  if (!profile?.is_active || profile.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Bạn không có quyền xem danh sách này.' }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const rawCategory = params.get('category');
  const category = rawCategory && VALID_CATEGORIES.has(rawCategory as SaleWorkZaloCustomerCategoryFilter)
    ? rawCategory as SaleWorkZaloCustomerCategoryFilter
    : 'all';
  const page = parsePageParam(params.get('page') ?? undefined);
  const search = (params.get('q') ?? '').trim().slice(0, 60);

  try {
    const result = await searchSaleWorkZaloCustomerDialog(supabase, page, search, category);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ message: 'Không tải được danh sách liên hệ.' }, { status: 500 });
  }
}
