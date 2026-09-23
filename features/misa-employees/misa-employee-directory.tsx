'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Search, UsersRound } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { MisaEmployee } from '@/services/misa-report119';

type Props = {
  employees: MisaEmployee[];
  month: string;
  monthLabel: string;
  previousMonth: string | null;
  nextMonth: string | null;
};

function EmployeeColumn({ employees, startIndex, month }: {
  employees: MisaEmployee[];
  startIndex: number;
  month: string;
}) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-primary/5 px-3 py-2.5 text-sm font-semibold text-heading">
        <span className="text-center">#</span>
        <span>Nhân viên</span>
        <span className="flex items-center gap-2"><UsersRound aria-hidden="true" className="size-4" /> Số lượng KH</span>
      </div>
      <ol start={startIndex + 1} className="mt-1">
        {employees.map((employee, index) => (
          <li key={employee.id} className={index % 2 === 1 ? 'rounded-lg bg-primary/[0.025]' : ''}>
            <Link
              href={`/admin/misa-employees/${employee.id}?month=${month}`}
              className="grid min-h-11 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-1 text-sm text-heading transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="rounded-md bg-primary/10 px-1 py-0.5 text-center font-medium tabular-nums">{startIndex + index + 1}</span>
              <span className="min-w-0 break-words font-medium">{employee.name}</span>
              <span className="min-w-16 rounded-full bg-primary/10 px-2 py-1 text-center font-semibold tabular-nums text-primary">
                {employee.customerCount} KH
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MisaEmployeeDirectory({ employees, month, monthLabel, previousMonth, nextMonth }: Props) {
  const [query, setQuery] = useState('');
  const filtered = employees.filter((employee) => employee.name.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  const midpoint = Math.floor(filtered.length / 2);
  const columns = [filtered.slice(0, midpoint), filtered.slice(midpoint)];

  return (
    <div className="flex flex-col gap-3">
      <Card className="grid gap-4 rounded-2xl p-4 lg:grid-cols-[auto_minmax(16rem,1fr)_auto] lg:items-center lg:px-6">
        <div className="flex items-center gap-2">
          {previousMonth ? (
            <Link href={`/admin/misa-employees?month=${previousMonth}`} aria-label="Tháng trước" className="grid size-11 shrink-0 place-items-center rounded-xl border border-input-border text-heading shadow-xs hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <ChevronLeft aria-hidden="true" className="size-5" />
            </Link>
          ) : <span className="size-11" />}
          <span className="flex min-h-11 items-center gap-2 rounded-xl bg-primary/10 px-3 font-semibold text-primary">
            <CalendarDays aria-hidden="true" className="size-5" /> {monthLabel}
          </span>
          {nextMonth ? (
            <Link href={`/admin/misa-employees?month=${nextMonth}`} aria-label="Tháng sau" className="grid size-11 shrink-0 place-items-center rounded-xl border border-input-border text-heading shadow-xs hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <ChevronRight aria-hidden="true" className="size-5" />
            </Link>
          ) : <span className="size-11" />}
        </div>
        <div className="relative min-w-0 lg:ml-auto lg:w-full lg:max-w-sm">
          <label htmlFor="misa-employee-search" className="mb-1 block text-xs font-medium text-muted-foreground">Tìm kiếm nhân viên</label>
          <Search aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 size-5 text-muted-foreground" />
          <input
            id="misa-employee-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nhập tên nhân viên..."
            className="min-h-12 w-full rounded-xl border border-input-border bg-background py-2 pl-10 pr-3 text-base text-foreground shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <div className="flex min-h-14 items-center gap-3 rounded-xl bg-primary/5 px-4 text-primary">
          <UsersRound aria-hidden="true" className="size-6 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">{query.trim() ? 'Nhân viên tìm thấy' : 'Tổng số nhân viên'}</p>
            <p className="font-bold tabular-nums text-heading">{filtered.length} người</p>
          </div>
        </div>
      </Card>

      <Card flush className="rounded-2xl p-3 sm:p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <UsersRound aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Không tìm thấy nhân viên phù hợp.</p>
            <button type="button" onClick={() => setQuery('')} className="min-h-11 rounded-lg px-4 text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Xóa tìm kiếm</button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-0">
            {columns.map((column, index) => (
              <div key={index} className={index === 1 ? 'lg:border-l lg:border-border lg:pl-2' : 'lg:pr-2'}>
                <EmployeeColumn employees={column} startIndex={index === 0 ? 0 : midpoint} month={month} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
