# Derma Glow mobile packages

These native shells open the production Derma Glow application at:
`https://derma-glow-precision-care.drhesham-khashaba.chatgpt.site`

The hosted application remains the source of clinical data and authorization. Do not publish either shell until privacy, medical-device classification, store declarations, production identity, and penetration testing are approved.

## Android

Open `android/` in Android Studio, let it install the declared Android SDK, select a release keystore, then use **Build > Generate Signed Bundle / APK**. The package identifier is `com.dermaglow.precisioncare`.

## iOS

Open `ios/DermaGlow.xcodeproj` on macOS, select the Derma Glow development team and signing profile, update the bundle identifier if required, then use **Product > Archive**. Export the archive for App Store Connect to produce the signed IPA.

Apple may reject a thin website wrapper. Before App Store submission, add native value such as push notifications, secure camera capture, Face ID/passcode protection, or offline care instructions and complete the App Privacy questionnaire.
