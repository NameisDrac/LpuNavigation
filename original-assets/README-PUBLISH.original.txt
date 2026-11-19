# LPU Campus Navigator — Public Launch Package

This is a static HTML/CSS/JavaScript website. No build command or backend is required.

## Publish with Netlify (easiest)
1. Extract this ZIP.
2. Open the extracted `site` folder and check that `index.html`, `styles.css`, `places.js`, and `app.js` are directly inside it.
3. Open https://app.netlify.com/drop in your browser.
4. Sign in to the hosting account you will use to own/manage the website.
5. Drag the `site` folder onto the Netlify Drop area.
6. Wait for the deployment to finish, then open the HTTPS website URL Netlify provides.
7. Test search, map layers, a known destination, and GPS permission on a phone.

## Publish with GitHub Pages (alternative)
1. Create a GitHub repository for the site.
2. Upload the contents of the `site` folder to the repository root (the `index.html` file must be at the root).
3. In repository Settings > Pages, choose deployment from the `main` branch and `/ (root)`.
4. Save and wait for GitHub Pages to publish the site. Open the URL shown in Settings > Pages.

## Important before sharing publicly
- The page's student name, section and faculty details have been removed from this public package.
- The site is an independent student project, not an official LPU service. Keep this disclaimer visible.
- The browser's GPS feature needs user permission and a secure HTTPS page. Hosting services provide HTTPS URLs.
- The supplied campus coordinates are map reference points; not every building name or entrance has been independently verified.
- The map uses external OpenStreetMap/Esri resources and a public walking-routing endpoint. These are third-party services and may have usage limits or temporary outages. Do not run high-volume traffic against community demo endpoints; review their current usage policies before wide public launch.
- Saved mapping edits are stored in each visitor's own browser LocalStorage. They are not shared between visitors and are not backed up centrally.
- The current app is static. It does not have a shared database, account system, or admin moderation. Visitors cannot see edits another visitor makes.
- Do not publish private student information, phone numbers, login details, or personal location history.

## Local test
Open this folder in VS Code and use Live Server, or run a local static web server. Keep an internet connection available for map tiles and online mapping/routing services.


## LPU-inspired visual theme update
The interface uses a deep university-blue and warm ochre/orange design inspired by LPU's public visual language and the ochre rays described in LPU's media kit. It uses a simple text "L" monogram and does not reproduce the copyrighted official LPU seal or logo. The site remains an independent student project and is not an official LPU service.


## Branding
The header uses a custom typographic "LPU" project mark, not the official university seal. LPU's official media page states that its logo is copyrighted. Replace this custom mark with an official logo only if you have permission or an approved asset.


## Header logo and motto
- The header displays the LPU logo image supplied by the project owner (`site/assets/lpu-logo.png`).
- A centered “DREAM BIG” motto and a subtle original campus/academic motif fill the header background.
- Keep the image attribution/permission status with the project when distributing it. The image was supplied by the project owner; this package does not grant any additional trademark or copyright permission.


## Final header polish
The logo tile is transparent (the uploaded logo itself remains unchanged), the logo is larger, and a low-contrast campus-building photo texture is layered behind the navy header. The image, SVG details and logo are local assets inside `site/assets`, so they are included in the deployment package. The background has a navy overlay to keep the motto and GPS controls legible.


## Header background rendering fix
The campus panorama is now applied directly as layered CSS backgrounds on the header (rather than a negative-z-index pseudo-element). This avoids browsers placing the photo behind the header background. Keep `assets/campus-header-photo.webp` and `assets/header-campus-motif.svg` in the same `site/assets` folder when deploying.


## Project details and contact
The public page displays student/project attribution details supplied by the project owner and a Contact us mailto link to `devreddy0423@gmail.com`. This email address is visible to every website visitor and may receive unsolicited messages or spam. Remove or replace it before publishing if you do not want the address public.
