# ClearLoan EMI Calculator — Android APK via GitHub Actions

This project is the Replit React/Vite EMI Calculator packaged with Capacitor.

## GitHub
1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Push/commit to `main`.
4. Open **Actions** → **Build EMI Calculator APK**.
5. Wait for the workflow to finish.
6. Open the successful workflow run and download the **EMI-Calculator-APK** artifact.
7. Extract the downloaded artifact to get `app-debug.apk`.

The workflow builds the web app with Vite, creates the Android project with Capacitor, syncs the web assets, and builds the debug APK.

## App ID
`com.clearloan.emicalculator`

For Google Play Store publishing, create a signed release build and replace the debug signing configuration with your own keystore/signing secrets. Do not publish the debug APK as a production release.
