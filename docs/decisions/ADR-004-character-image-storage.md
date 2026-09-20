# ADR-004: Store one character image on the filesystem

Status: Accepted
Date: 2026-09-06
Decision owners: Patrick
Related tasks and contracts: TASK-018 (implementation); no related contracts

## Context

Characters had no image field, upload infrastructure, or image-processing
pipeline. Adding character images required deciding where the image bytes live,
whether cards and full views use separate generated sizes, and which users receive
image-management controls.

The character list already returns every character column on dashboard load. The
application is a small trusted-user tool whose static `public/` tree is served
without per-file authorization. The player edit flow already provides a natural
place to manage a player's own character image, while the DM character view has no
general edit form to extend.

## Decision

Uploaded image bytes are stored under `public/uploads/characters/`, and the
nullable `characters.image_url` column stores only the served URL. Uploads are
excluded from version control. Image URLs can be changed only through dedicated
authenticated upload and delete endpoints, not through the generic character
update route.

One original uploaded file serves both the small character-card thumbnail and the
larger character-sheet image. CSS controls the displayed dimensions; the server
does not resize images or generate thumbnails.

Image-management controls are added only to the player edit flow for a player's
own characters. The endpoints retain the existing character-mutation authorization
rule, which also permits a DM or admin, but no DM-side upload, replace, or remove UI
is introduced.

## Alternatives considered

- Store base64 data or a BLOB in SQLite. Rejected because list queries select every
  character column, which would make every dashboard load carry the full image
  bytes and enlarge the database unnecessarily.
- Generate and store server-side thumbnails. Rejected because one CSS-sized image
  satisfies both current views without adding image-processing infrastructure or a
  dependency such as `sharp`.
- Add image controls to both player and DM views. Rejected because the DM view has
  no general character-edit form, so this would require unrelated new UI rather
  than extending the existing player flow.

## Consequences

### Benefits

- Character queries continue to return only a short URL rather than image bytes.
- The implementation needs one stored file and no image-processing dependency.
- Players can upload, replace, preview, and remove their own character image from
  the existing edit flow without expanding the DM interface.
- Unique filenames prevent a replaced image from reusing a stale browser cache
  URL.

### Costs and risks

- Uploaded files must be preserved separately from the SQLite database during
  backup, restore, and deployment.
- Static image URLs are publicly servable to anyone who knows them, consistent with
  the application's existing static-file posture.
- Full-size uploads are transferred even when displayed as small thumbnails, and
  CSS sizing does not reduce bandwidth.
- Filesystem and database changes are not a single atomic transaction; operational
  failures may require reconciliation.

## Follow-up work

- DM-side image-management UI, image transformation, and multiple-image support
  remain outside TASK-018 and require separate approved work if desired.
