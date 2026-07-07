import { themeInitScript } from "@/lib/theme-script";

export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeInitScript() }}
      id="theme-init"
    />
  );
}
