# Layered Architecture

Bhasha Trade will use a dependency direction that always points inward:

```text
HTTP routes -> controllers -> application services -> repositories / provider ports
                                                   -> SQLite / external providers
```

## Layers

| Layer | Responsibility | Must not do |
| --- | --- | --- |
| `src/routes` | Map HTTP method and URL to a controller; attach authentication middleware. | Contain business rules or SQL. |
| `src/controllers` | Read request data, select HTTP status codes, and return response DTOs. | Query the database or call external SDKs. |
| `src/services` | Enforce business rules, ownership, workflows, and transactions. | Depend on Express request/response objects. |
| `src/repositories` | Read and write domain data through SQLite/PostgreSQL. | Make policy decisions. |
| `src/providers` | Adapt external systems: SMS OTP, Bhashini, weather, storage, crop detection, and push notifications. | Leak vendor-specific objects into services. |
| `src/domain` | Shared entities, enums, validation rules, and domain errors. | Import Express, SQLite, or provider code. |
| `src/middleware` | Cross-cutting request concerns: authentication, error handling, rate limiting, and request IDs. | Implement a use case. |

## Domain Modules

Each API group stays together across layers:

- `auth`: phone OTP, session token, profile, language preference
- `market`: mandi prices and nearby-mandi calculation
- `marketplace`: produce listings, interest, and order lifecycle
- `barter`: request parsing, matching, connection, and completion
- `advisory`: chat history, speech, crop health, and weather
- `trust`: reviews, verification status, and notifications

## Rules That Protect The Architecture

1. Controllers return HTTP responses; services return plain values or domain errors.
2. Only repositories import the database module.
3. Only providers know SMS, Bhashini, IMD/OpenWeather, Cloudinary, or ML SDK details.
4. A service receives dependencies through construction, making unit tests use fake repositories/providers.
5. API response shapes remain stable while internals are moved into layers.

## Refactor Sequence

1. Extract shared middleware and response/error helpers.
2. Move `auth` and `market` first because they have the smallest dependencies.
3. Move `marketplace` and `barter`, preserving authorization and state transitions.
4. Replace demo provider responses with concrete provider adapters configured through environment variables.

