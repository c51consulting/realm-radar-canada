/**
 * USA-10: Strip the site chrome (header/footer/nav) so the embed page is a clean
 * iframe surface.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
