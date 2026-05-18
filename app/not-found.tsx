export default function NotFound() {
  return (
    <div className="text-center py-20">
      <p className="text-realm-rust uppercase tracking-wider text-sm">404</p>
      <h1 className="font-serif text-4xl mt-2">Nothing on this part of the radar.</h1>
      <p className="mt-3 text-realm-ink/70">The page you&rsquo;re looking for doesn&rsquo;t exist or has been archived.</p>
      <a href="/radar" className="mt-6 inline-block rounded-full bg-realm-moss px-5 py-2.5 text-realm-paper text-sm">Back to Radar</a>
    </div>
  );
}
