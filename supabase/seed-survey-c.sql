-- Synthetic seed data for survey_c_responses (64 rows).
-- Run in Supabase → SQL Editor AFTER survey_c_responses exists
-- (schema.sql or add-survey-c-table.sql).
--
-- Distribution notes:
--   • ~12–13 responses per item across all 5 catalog products
--   • Ratings biased per item (see ITEM_PROFILES / product character)
--   • Intent correlated with average rating (higher → more YES)
--   • created_at spread over the prior ~18 days
--
-- To re-seed cleanly, uncomment the DELETE below (removes ALL rows,
-- including any real sessions collected so far).
--
-- delete from public.survey_c_responses;

insert into public.survey_c_responses (
  session_token,
  selected_item,
  fabric,
  fit,
  colour,
  price,
  intent,
  created_at
) values
  ('0c8fc34f-6c45-4dd1-81ab-c3388955a518', 'waterloo-hoodie', 5, 4, 2, 3, 'YES', '2026-07-08T09:15:45.000Z'),
  ('918cdc0c-60cf-4f2e-88e3-6c6ccec2d65d', 'nike-windbreaker', 2, 3, 5, 3, 'YES', '2026-07-08T09:53:55.000Z'),
  ('ca3e1503-81a2-4416-b0ba-9aebd951c3ad', 'adidas-track-jacket', 4, 4, 3, 3, 'NO', '2026-07-08T10:05:24.000Z'),
  ('67866118-1c72-4946-8f01-3fdce0a4c273', 'chevrolet-jersey', 4, 4, 5, 3, 'YES', '2026-07-08T10:38:53.000Z'),
  ('49b6dbb1-0635-4ec0-af25-343882d06242', 'black-zip-hoodie', 3, 5, 4, 4, 'NO', '2026-07-08T15:35:32.000Z'),
  ('bf98b0f4-ac63-4505-9fb6-31b87a628cdc', 'black-zip-hoodie', 2, 4, 5, 5, 'NO', '2026-07-08T21:29:50.000Z'),
  ('911e9629-a9c7-4d0b-ba23-305e913a57c6', 'nike-windbreaker', 4, 2, 4, 5, 'YES', '2026-07-09T08:01:49.000Z'),
  ('d65d3f2f-c4bd-45fd-baa7-9684238cc6d0', 'black-zip-hoodie', 5, 5, 4, 3, 'YES', '2026-07-09T16:50:28.000Z'),
  ('be1c966e-98ab-404c-a790-2d59075ac20c', 'chevrolet-jersey', 3, 2, 4, 3, 'NO', '2026-07-10T11:28:52.000Z'),
  ('f1b1fd72-cc24-4329-ad96-58261c046ba9', 'black-zip-hoodie', 4, 4, 3, 4, 'NO', '2026-07-10T20:04:36.000Z'),
  ('44f38276-2a51-4194-8e9b-703795ea2c12', 'nike-windbreaker', 4, 5, 5, 3, 'YES', '2026-07-11T14:08:04.000Z'),
  ('7e962207-b793-4345-9301-468e4a465af2', 'black-zip-hoodie', 4, 5, 3, 4, 'YES', '2026-07-11T17:37:12.000Z'),
  ('16f6fe58-c20f-4680-a505-1ba4a2f8d29e', 'waterloo-hoodie', 5, 4, 4, 3, 'YES', '2026-07-12T15:05:49.000Z'),
  ('30e9adab-a4d2-4947-a3c9-9f3d68fb44d9', 'adidas-track-jacket', 3, 4, 3, 3, 'NO', '2026-07-12T16:20:00.000Z'),
  ('fd3587ae-d209-4970-bc2b-702aad896ca5', 'adidas-track-jacket', 4, 3, 4, 1, 'YES', '2026-07-12T18:50:43.000Z'),
  ('46226249-399e-4f90-baea-9ba00bb168af', 'waterloo-hoodie', 3, 4, 5, 3, 'YES', '2026-07-12T21:35:27.000Z'),
  ('75645873-3b53-4d3d-82fd-b37fee290866', 'chevrolet-jersey', 3, 3, 4, 4, 'NO', '2026-07-13T09:06:48.000Z'),
  ('51767c91-449e-45b0-bd29-1aa90f82c920', 'nike-windbreaker', 4, 4, 4, 4, 'YES', '2026-07-13T12:33:21.000Z'),
  ('e062d830-f681-424e-8daf-bc69ddf1119e', 'waterloo-hoodie', 3, 1, 3, 2, 'NO', '2026-07-13T13:14:12.000Z'),
  ('23db9632-c7d3-4fa4-b729-878ff04ef39d', 'waterloo-hoodie', 5, 5, 1, 3, 'NO', '2026-07-13T15:10:18.000Z'),
  ('3b3cfe00-7f06-49a6-bbc9-7d1833d64670', 'chevrolet-jersey', 3, 2, 3, 5, 'NO', '2026-07-13T15:25:20.000Z'),
  ('b412306f-9727-496b-a900-dbec346454ba', 'nike-windbreaker', 5, 4, 4, 4, 'YES', '2026-07-13T16:37:35.000Z'),
  ('7b849115-8ebf-48bc-9c6a-ba01259ce312', 'waterloo-hoodie', 2, 2, 4, 3, 'YES', '2026-07-13T16:55:58.000Z'),
  ('dab23ab0-1b17-489c-a1eb-a87439206c37', 'waterloo-hoodie', 4, 3, 2, 3, 'NO', '2026-07-13T17:06:16.000Z'),
  ('a95877b2-833d-410e-9013-cea0ef858468', 'adidas-track-jacket', 4, 5, 5, 3, 'YES', '2026-07-13T17:24:03.000Z'),
  ('8a1a6b76-1a38-4974-9345-9a33308344bb', 'nike-windbreaker', 4, 4, 4, 4, 'YES', '2026-07-14T20:52:12.000Z'),
  ('69765ab6-035a-4b4e-bb16-cbbe6e1ed458', 'nike-windbreaker', 2, 3, 3, 3, 'NO', '2026-07-15T15:35:23.000Z'),
  ('db2642ba-a091-435d-a467-53f89ed8296d', 'waterloo-hoodie', 3, 4, 3, 2, 'NO', '2026-07-15T21:48:50.000Z'),
  ('cc850d87-78be-4a92-9679-4c3f24d2c6fd', 'waterloo-hoodie', 4, 5, 3, 5, 'YES', '2026-07-16T10:45:49.000Z'),
  ('326b8f94-7479-41c0-960d-c08e07b6db3f', 'nike-windbreaker', 4, 3, 4, 4, 'YES', '2026-07-16T19:51:00.000Z'),
  ('103a589a-807a-4a28-9f26-d0b9c0f78f17', 'chevrolet-jersey', 2, 4, 5, 3, 'YES', '2026-07-17T08:11:10.000Z'),
  ('1b3d9a58-984e-4e45-bf0e-5928fa171fc8', 'black-zip-hoodie', 1, 5, 4, 4, 'YES', '2026-07-17T11:08:06.000Z'),
  ('d1dd1a28-d210-4fc5-838f-944389a6f612', 'waterloo-hoodie', 5, 4, 3, 4, 'YES', '2026-07-17T12:05:02.000Z'),
  ('080e6fa2-e1a2-494d-b4f6-9b6bcaec730a', 'adidas-track-jacket', 3, 5, 5, 3, 'YES', '2026-07-17T12:16:29.000Z'),
  ('323d145c-fc9e-455c-9998-88e76b93b9bf', 'adidas-track-jacket', 2, 4, 2, 3, 'NO', '2026-07-17T12:28:02.000Z'),
  ('0c754ec9-ed14-44dc-b438-d9ce13a7a89a', 'black-zip-hoodie', 4, 4, 5, 5, 'YES', '2026-07-17T18:47:10.000Z'),
  ('7f73f528-3eac-4a17-9f14-b0ca08e656f2', 'nike-windbreaker', 2, 5, 5, 3, 'NO', '2026-07-18T13:42:15.000Z'),
  ('86f49e9c-f313-47f0-a016-686a90a86587', 'black-zip-hoodie', 4, 4, 4, 4, 'NO', '2026-07-18T18:33:40.000Z'),
  ('3aaba426-bb58-417c-90ea-08e1fd14a87c', 'adidas-track-jacket', 5, 3, 4, 2, 'YES', '2026-07-18T21:34:49.000Z'),
  ('663ae8b7-fce2-42d8-aee0-ce91462144e0', 'chevrolet-jersey', 4, 5, 3, 5, 'YES', '2026-07-18T21:50:31.000Z'),
  ('6c9513e0-4869-4a2d-a308-85af2277c2b5', 'chevrolet-jersey', 4, 3, 3, 3, 'NO', '2026-07-19T09:17:17.000Z'),
  ('b563e687-a88d-4f53-8445-59cea75ceb7c', 'black-zip-hoodie', 3, 3, 5, 3, 'YES', '2026-07-19T16:57:02.000Z'),
  ('590f8731-db15-4328-a9bf-4a520aeba713', 'adidas-track-jacket', 4, 4, 4, 5, 'NO', '2026-07-20T12:19:53.000Z'),
  ('17cbd728-0576-40af-b9da-3de184cad0e7', 'black-zip-hoodie', 2, 2, 5, 4, 'YES', '2026-07-20T21:04:44.000Z'),
  ('0e09e297-67c4-4c87-a43a-67e37f29cf27', 'black-zip-hoodie', 4, 3, 5, 3, 'NO', '2026-07-21T10:14:35.000Z'),
  ('25fb69f0-c0de-4e42-9d38-2a058d6b4b15', 'chevrolet-jersey', 4, 5, 4, 4, 'YES', '2026-07-21T15:23:45.000Z'),
  ('71a45698-52c9-436c-b3e0-7e11ca3cccc2', 'nike-windbreaker', 2, 1, 4, 4, 'NO', '2026-07-21T19:29:05.000Z'),
  ('98790ba8-57e2-4788-b410-badc5cdb64f9', 'black-zip-hoodie', 3, 3, 2, 3, 'YES', '2026-07-22T08:34:17.000Z'),
  ('a331dab9-1b47-4650-a9a4-0113525bcbba', 'chevrolet-jersey', 4, 5, 5, 3, 'YES', '2026-07-22T10:28:35.000Z'),
  ('03065f4c-c42d-4ab0-b191-712bb65f3fde', 'waterloo-hoodie', 4, 4, 4, 4, 'YES', '2026-07-22T12:36:41.000Z'),
  ('24878e22-686a-4856-af52-349c16a4152d', 'chevrolet-jersey', 4, 3, 5, 4, 'YES', '2026-07-22T13:42:27.000Z'),
  ('1273b531-98bb-4b87-9000-fb568bec33c1', 'waterloo-hoodie', 3, 4, 4, 5, 'YES', '2026-07-22T18:02:53.000Z'),
  ('1208a9e2-1ef4-405d-9c70-d51ed9d7b081', 'adidas-track-jacket', 3, 4, 5, 1, 'NO', '2026-07-23T12:00:02.000Z'),
  ('4eacd30f-ea44-494a-8324-a548f91fa788', 'nike-windbreaker', 3, 5, 4, 3, 'YES', '2026-07-23T15:04:06.000Z'),
  ('ab162d18-c570-4319-9b47-c94d91da22f2', 'chevrolet-jersey', 2, 4, 3, 3, 'NO', '2026-07-23T15:15:35.000Z'),
  ('f6d5874c-57ad-498d-9c21-e68ff5735fb2', 'black-zip-hoodie', 5, 3, 3, 5, 'YES', '2026-07-24T08:57:14.000Z'),
  ('aa4d3361-e6a6-40c9-ba7c-7f6eba69466e', 'chevrolet-jersey', 3, 4, 4, 4, 'NO', '2026-07-24T11:05:59.000Z'),
  ('403f4497-652e-4878-a097-0481251c69d9', 'nike-windbreaker', 2, 5, 4, 3, 'YES', '2026-07-24T14:35:22.000Z'),
  ('df69757b-ba1f-4d18-8fff-3b6bcbc9a604', 'adidas-track-jacket', 5, 4, 4, 2, 'YES', '2026-07-24T16:56:54.000Z'),
  ('b653a4bb-f07a-4340-a7ca-aa96eef98acb', 'nike-windbreaker', 3, 4, 3, 3, 'NO', '2026-07-24T21:04:34.000Z'),
  ('9f380568-2cd7-43f7-b1cc-a44c62214213', 'adidas-track-jacket', 5, 3, 3, 4, 'NO', '2026-07-25T08:29:27.000Z'),
  ('a9e1b48f-009e-4fd4-a475-392a8ee8216a', 'adidas-track-jacket', 4, 4, 4, 3, 'YES', '2026-07-25T10:58:22.000Z'),
  ('0ebaa1f5-188e-457b-a58d-e56827cfa2eb', 'waterloo-hoodie', 4, 4, 2, 4, 'NO', '2026-07-25T21:00:30.000Z'),
  ('40885861-3e11-4d5d-a7bf-e2a8a7fb1c82', 'adidas-track-jacket', 4, 3, 4, 2, 'NO', '2026-07-25T21:02:26.000Z');
