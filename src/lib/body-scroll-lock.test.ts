import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verrouillage du scroll du document.
 *
 * L'ecran de demarrage et le guide de bienvenue peuvent se chevaucher : le
 * nettoyage de l'un ne doit pas liberer le verrou de l'autre (le fond
 * defilait sous la modale).
 */

const fakeBody = { style: { overflow: "" } };

beforeEach(() => {
  fakeBody.style.overflow = "";
  vi.stubGlobal("document", { body: fakeBody });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadModule() {
  return await import("@/lib/body-scroll-lock");
}

describe("verrouillage du scroll", () => {
  it("bloque le scroll au premier verrou", async () => {
    const { lockBodyScroll, bodyScrollLockCount } = await loadModule();
    lockBodyScroll();
    expect(fakeBody.style.overflow).toBe("hidden");
    expect(bodyScrollLockCount()).toBe(1);
  });

  it("un second verrou ne libere pas le premier", async () => {
    const { lockBodyScroll, unlockBodyScroll, bodyScrollLockCount } = await loadModule();
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    expect(fakeBody.style.overflow).toBe("hidden");
    expect(bodyScrollLockCount()).toBe(1);
  });

  it("libere le scroll quand le dernier verrou est leve", async () => {
    const { lockBodyScroll, unlockBodyScroll, bodyScrollLockCount } = await loadModule();
    lockBodyScroll();
    lockBodyScroll();
    unlockBodyScroll();
    unlockBodyScroll();
    expect(fakeBody.style.overflow).toBe("");
    expect(bodyScrollLockCount()).toBe(0);
  });

  it("restaure la valeur d'origine du scroll", async () => {
    fakeBody.style.overflow = "auto";
    const { lockBodyScroll, unlockBodyScroll } = await loadModule();
    lockBodyScroll();
    expect(fakeBody.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(fakeBody.style.overflow).toBe("auto");
  });

  it("ignorer un unlock sans verrou ne casse rien", async () => {
    const { unlockBodyScroll, bodyScrollLockCount } = await loadModule();
    unlockBodyScroll();
    expect(bodyScrollLockCount()).toBe(0);
    expect(fakeBody.style.overflow).toBe("");
  });
});
