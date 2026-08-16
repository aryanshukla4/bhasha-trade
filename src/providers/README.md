# Provider Adapters

Provider adapters keep vendor code out of business services.

- `sms.provider.js`: MSG91, Twilio Verify, or Firebase OTP delivery
- `translation.provider.js`: Bhashini translation, ASR, and TTS
- `weather.provider.js`: IMD or OpenWeather forecast retrieval
- `storage.provider.js`: Cloudinary/Firebase image upload
- `crop-diagnosis.provider.js`: PlantVillage-compatible model inference

The development API returns explicit fallback responses until a provider is configured. Do not put vendor SDK calls in route handlers.
