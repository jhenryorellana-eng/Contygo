/** Copies text; where the clipboard API is refused (some in-app browsers), the old way through a hidden field. */
export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const field = document.createElement("textarea");
    field.value = text; field.setAttribute("readonly", ""); field.style.cssText = "position:fixed;opacity:0;font-size:16px";
    document.body.appendChild(field); field.select(); field.setSelectionRange(0, text.length);
    let done = false;
    try { done = document.execCommand("copy"); } catch { done = false; }
    field.remove();
    return done;
  }
}
