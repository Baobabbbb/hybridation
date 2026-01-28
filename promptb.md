Act as a Lead Product Designer at Apple in the year 2026.

I need you to implement the **"iOS 26 Liquid Glass"** design language in pure CSS (no JS libraries, strictly modern CSS). 

**Context - iOS 26 Aesthetic:**
In 2026, the interface is no longer just "glass"; it behaves like a **viscous, semi-fluid optical lens**. It reacts to light, has variable density, and uses "Living Color" gradients.

**Technical Specifications for Cursor:**

1.  **Color Space (Critical):**
    * Use **OKLCH** exclusively for colors to access the wide gamut (P3/Rec.2020) typical of 2026 displays.
    * Define a `fluid-accent` palette that feels hyper-vibrant but readable.

2.  **The `.liquid-ios26` Card Component:**
    * **Surface:** Instead of a flat background, use a `linear-gradient` mixed with a `radial-gradient` to simulate curvature and uneven thickness of the glass.
    * **Variable Blur:** The `backdrop-filter` should not be uniform. If possible, use a mask or layered pseudo-elements to create a "depth blur" (sharper in the center, blurrier at edges).
    * **The "Meniscus" Border:** The border should look like surface tension. Use `box-shadow` layering:
        * `inset 0 0.5px 0 0.5px rgba(255,255,255,0.7)` (sharp top highlight)
        * `inset 0 -1px 2px 0 rgba(0,0,0,0.1)` (bottom refraction)
        * `0 15px 35px -10px oklch(0.2 0.05 260 / 0.3)` (colored ambient drop shadow).

3.  **Refraction & Caustics (The "Liquid" part):**
    * Add a `::before` pseudo-element with a subtle, noise-grained gradient overlay (`mix-blend-mode: overlay`) to simulate the texture of high-refractive index polymer.
    * Add a white "glare" spot that is not static.

4.  **Interactivity (Micro-physics):**
    * Hover state: The card should not just lift; it should "morph" slightly. Change the `border-radius` unpredictably by small amounts (e.g., from `32px` to `30px 34px 31px 33px`) to simulate a liquid container changing shape under pressure.
    * Use `transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1)` (spring physics) for a bouncy, jelly-like feel.

5.  **Typography:**
    * Font: System UI (San Francisco Rounded).
    * Ink Effect: Text color should look like it's "inside" the liquid, slightly darker than the surface but with a `0 1px 0 rgba(255,255,255,0.4)` reflection underneath (engraved look).

**Deliverables:**
* A fully functional CSS/HTML demo of a "Smart Widget" (e.g., Weather or Health tracker).
* Ensure the background behind the glass contains moving abstract shapes so the refraction effect is demonstrable.