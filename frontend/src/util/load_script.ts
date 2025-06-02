/**
 * This can be used if we get CSP 
 */
export function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if the script is already loaded
    if (document.getElementById(id)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));

    document.head.appendChild(script);
  });
}
