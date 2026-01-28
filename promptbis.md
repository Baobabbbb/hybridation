@agents.md

# Role
Act as a **Senior Frontend Engineer** expert in Three.js and Canvas manipulation.

# Task
Upgrade the `Scene360` component to implement the "Click-to-Crop" feature for visual search.

# Objective
When the user clicks anywhere on the 3D sphere (the furniture), we must extract a cropped image of that specific area to send it to the Visual Search API.

# Technical Implementation Steps

## 1. Interaction Logic (Raycasting)
- Add an `onClick` event handler to the `<Sphere>` mesh.
- From the event object, extract the `uv` coordinates (`e.uv`).
  - `u` corresponds to the X axis of the texture.
  - `v` corresponds to the Y axis of the texture.
- Add a visual feedback: Place a small distinct "Marker" (like a small red sphere or a pin icon) at the exact `point` of the click to show the user what they selected.

## 2. Image Cropping (The Math)
Create a utility function `cropImageFromUV(imageUrl, uv)`:
- Load the original image into an HTML `Image` object.
- Create an off-screen `<canvas>`.
- Calculate the center pixel coordinates:
  - `x = uv.x * image.width`
  - `y = (1 - uv.y) * image.height` (Note: Three.js UVs usually flip Y, so check if `1 - uv.y` or just `uv.y` is needed based on the texture mapping).
- Define a crop size (e.g., 500x500 pixels).
- Draw the image onto the canvas context, but shifted so the clicked point is in the center.
- Export the result as a Base64 string (`canvas.toDataURL`).

## 3. Integration
- Pass a prop `onSelectProduct` (callback) to the `Scene360` component.
- When the cropping is done, call this function with the Base64 image.
- **Performance:** Use `useCallback` to prevent re-renders.

# Instructions for Cursor
- Implement the complete logic inside `Scene360`.
- Handle the asynchronous loading of the image for the canvas operations.
- Ensure the coordinate mapping is accurate (clicking the lamp should crop the lamp, not the floor).

GO.