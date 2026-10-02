# Tripo generation record

The eight assets below were approved as one batch. Each command used CLI model alias `tripo-v3.1`, sent wire model `v3.1-20260211`, set `face_limit=12000`, and made one `POST /v3/generation/text-to-model` call. Default texture and PBR were enabled. Each completed task cost 20 credits. Failed tasks would have been refunded; none failed. Every GLB and preview was inspected before the next paid call.

| Asset | Task ID | Actual credits |
| --- | --- | ---: |
| coastal-arch | `f1d3b259-14ae-4c47-b681-0a1a46f474dc` | 20 |
| stone-bridge | `3447e92d-3a40-4198-bd94-13b732721fbc` | 20 |
| palm-tree | `80247025-d990-4319-b3aa-6098ab1287ce` | 20 |
| instant-camera | `59ae29ac-4de2-4621-a5cf-95727b9e7cc1` | 20 |
| beach-umbrella | `d542fdd7-442a-401a-a9b6-392f49abc18d` | 20 |
| sailboat | `03a9f6f1-4a3e-4051-812c-2cd8ea102ace` | 20 |
| postcard-kiosk | `af184cb9-2642-494d-a4d8-5df02481486e` | 20 |
| seaside-gazebo | `3f713fd1-7c79-41d4-bfe1-b34ec65a842b` | 20 |

## Exact prompts

- `coastal-arch`: A freestanding white stucco Mediterranean seaside archway with two thick columns and a walk-through opening, subtle turquoise tile trim and sun-worn edges, refined colorful stylized 3D game art, isolated single object, no ground, no people
- `stone-bridge`: A small white stone pedestrian bridge with a gently arched walkable deck, low parapet rails, coastal Mediterranean architecture, refined colorful stylized 3D game art, isolated single object, no ground, no water, no people
- `palm-tree`: A lush sculptural coastal palm tree with one curved textured trunk and a broad crown of green fronds, refined colorful stylized 3D game art, isolated single object, no ground, no people
- `instant-camera`: A coral and ivory vintage instant camera with a prominent round lens, viewfinder and photo exit slot, charming detailed stylized 3D game prop, isolated single object, no hands, no text
- `beach-umbrella`: A peach and turquoise striped beach parasol with a slender wooden pole and round stand, refined colorful stylized 3D game art, isolated single object, no sand, no people
- `sailboat`: A small elegant white wooden sailboat with coral trim and a turquoise triangular sail, Mediterranean seaside holiday style, refined colorful stylized 3D game art, isolated single object, no water, no people
- `postcard-kiosk`: A small freestanding seaside postcard kiosk with white stucco body, turquoise shutters and a coral mail slot, charming Mediterranean holiday style, refined colorful stylized 3D game art, isolated single object, no ground, no text
- `seaside-gazebo`: A delicate open-air white coastal gazebo with four columns, pale stone steps, turquoise roof tiles and an open walk-through center, refined colorful stylized 3D game art, isolated single object, no ground, no people

The original artifact folders include `model.glb`, `preview.png`, rendered images and `task.json`. The game copies selected GLBs and previews into `public/assets/models/`.
