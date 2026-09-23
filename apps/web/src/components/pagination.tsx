import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      <p className="tabular text-sm text-muted-foreground">
        {first}–{last} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <CaretLeftIcon aria-hidden />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
          <CaretRightIcon aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
