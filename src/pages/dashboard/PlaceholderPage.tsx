const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-muted-foreground">Этот раздел находится в разработке</p>
  </div>
);

export default PlaceholderPage;
