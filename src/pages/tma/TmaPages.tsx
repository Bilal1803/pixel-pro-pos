const TmaPlaceholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <h1 className="text-xl font-bold">{title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Раздел в разработке</p>
  </div>
);

export const TmaSalesPage = () => <TmaPlaceholder title="Продажа" />;
export const TmaInventoryPage = () => <TmaPlaceholder title="Склад" />;
export const TmaCashPage = () => <TmaPlaceholder title="Касса" />;
export const TmaShiftPage = () => <TmaPlaceholder title="Смена" />;
