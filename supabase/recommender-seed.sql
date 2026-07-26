-- Alternative Item Recommender — catalog seed.
-- Run after recommender-schema.sql. Safe to re-run (upserts by primary key).
--
-- Attributes are synthesized from the product photography in public/items/.
-- Twenty-one styles across 23 colourways; every style carries three sizes, so
-- the fit rule always has a +/- 1 neighbour to reach for.

-- ---------------------------------------------------------------------------
-- Store
-- ---------------------------------------------------------------------------

insert into public.stores (store_id, name, city) values
  ('kw-flagship', 'Fitting Room Companion — Flagship', 'Waterloo')
on conflict (store_id) do update
  set name = excluded.name, city = excluded.city;

-- ---------------------------------------------------------------------------
-- Materials
-- ---------------------------------------------------------------------------

insert into public.materials (material_id, label, family, hand_feel) values
  ('nylon-shell',         'Nylon shell',            'synthetic', 'smooth, crisp, wind-resistant'),
  ('poly-tricot',         'Polyester tricot',       'synthetic', 'slick and cool to the touch'),
  ('poly-mesh',           'Polyester mesh',         'synthetic', 'airy and open-knit'),
  ('poly-stretch',        'Stretch polyester',      'synthetic', 'smooth four-way stretch'),
  ('poly-jersey',         'Polyester jersey',       'synthetic', 'lightweight and slippery'),
  ('cotton-fleece',       'Cotton fleece',          'natural',   'brushed and plush inside'),
  ('cotton-jersey',       'Cotton jersey',          'natural',   'soft and breathable'),
  ('heavy-cotton-jersey', 'Heavyweight cotton',     'natural',   'substantial with structured drape'),
  ('cotton-rib',          'Ribbed cotton',          'natural',   'stretchy and close-fitting'),
  ('cotton-terry',        'Cotton French terry',    'natural',   'looped, soft, mid-weight'),
  ('cotton-blend-knit',   'Cotton blend knit',      'blend',     'smooth mid-weight knit'),
  ('brushed-flannel',     'Brushed cotton flannel', 'natural',   'napped and warm'),
  ('cotton-oxford',       'Cotton oxford',          'natural',   'crisp basketweave'),
  ('cotton-twill',        'Cotton twill',           'natural',   'sturdy and structured'),
  ('rigid-denim',         'Rigid denim',            'natural',   'stiff and heavyweight'),
  ('washed-denim',        'Washed denim',           'natural',   'broken-in and pliable')
on conflict (material_id) do update
  set label = excluded.label,
      family = excluded.family,
      hand_feel = excluded.hand_feel;

-- ---------------------------------------------------------------------------
-- Colours
-- ---------------------------------------------------------------------------

insert into public.colors (color_id, label, family, hex) values
  ('black',             'Black',              'neutral', '#101010'),
  ('navy',              'Navy',               'blue',    '#1b2a41'),
  ('colourblock-navy',  'Navy colour-block',  'blue',    '#24356b'),
  ('heather-grey',      'Heather grey',       'neutral', '#9a9a9a'),
  ('light-grey',        'Light grey',         'neutral', '#cfd2d4'),
  ('grey-marl',         'Grey marl',          'neutral', '#b9bcbe'),
  ('grey-print',        'Grey print',         'neutral', '#a7abae'),
  ('light-blue',        'Light blue',         'blue',    '#a8c7de'),
  ('seafoam',           'Seafoam',            'blue',    '#b6ccc8'),
  ('cream-navy',        'Cream and navy',     'neutral', '#ece7dc'),
  ('maroon',            'Maroon',             'red',     '#6d2a34'),
  ('rust-check',        'Rust check',         'red',     '#b4462a'),
  ('navy-check',        'Navy check',         'blue',    '#2a3a4a'),
  ('indigo',            'Indigo',             'blue',    '#2b3550'),
  ('medium-indigo',     'Medium indigo wash', 'blue',    '#46587c'),
  ('light-wash',        'Light wash',         'blue',    '#b9d3e6'),
  ('charcoal',          'Charcoal',           'neutral', '#4a4f52'),
  ('sage',              'Sage',               'green',   '#b9bda6')
on conflict (color_id) do update
  set label = excluded.label, family = excluded.family, hex = excluded.hex;

-- ---------------------------------------------------------------------------
-- Styles
-- ---------------------------------------------------------------------------

insert into public.styles
  (style_id, title, brand, apparel_type, design_type, category_group, material_id, fit_profile, description, survey_item_id)
values
  ('nike-windrunner', 'Nike Windrunner Windbreaker', 'Nike', 'Jackets', 'Windbreakers',
   'outerwear', 'nylon-shell', 'regular',
   'Lightweight hooded windbreaker with the classic chevron seam and a smooth nylon shell.',
   'nike-windbreaker'),

  ('adidas-santiago-track', 'Adidas Santiago Track Jacket', 'Adidas', 'Jackets', 'Track Jackets',
   'outerwear', 'poly-tricot', 'regular',
   'Colour-blocked tricot track jacket with the three-stripe sleeve and a full-zip front.',
   'adidas-track-jacket'),

  ('hollister-rbr-bomber', 'Hollister x Oracle Red Bull Racing Bomber', 'Hollister', 'Jackets', 'Bombers',
   'outerwear', 'nylon-shell', 'regular',
   'Navy racing bomber with a stand collar, elasticated cuffs and contrast topstitching.',
   null),

  ('waterloo-zip-hoodie', 'University of Waterloo Zip Hoodie', 'Waterloo', 'Hoodies', 'Zip Hoodies',
   'outerwear', 'cotton-fleece', 'regular',
   'Heather grey full-zip hoodie in brushed cotton fleece with university branding.',
   'waterloo-hoodie'),

  ('essential-zip-hoodie', 'Essential Full-Zip Hoodie', 'Everyday', 'Hoodies', 'Zip Hoodies',
   'outerwear', 'cotton-fleece', 'regular',
   'Solid black full-zip hoodie in brushed fleece, cut for everyday layering.',
   'black-zip-hoodie'),

  ('relaxed-crew-sweatshirt', 'Relaxed Crew Neck Sweatshirt', 'Uniqlo', 'Hoodies', 'Sweatshirts',
   'tops', 'cotton-blend-knit', 'relaxed',
   'Minimal drop-shoulder crewneck with ribbed cuffs and hem in a muted seafoam blue.',
   null),

  ('chevrolet-graphic-jersey', 'Chevrolet Graphic Jersey Tee', 'Chevrolet', 'Tees', 'Graphic Jerseys',
   'tops', 'poly-mesh', 'regular',
   'Maroon athletic jersey tee in open polyester mesh with a vintage racing graphic.',
   'chevrolet-jersey'),

  ('hollister-crew-tee', 'Hollister Basic Crew Neck Tee', 'Hollister', 'Tees', 'Crew Tees',
   'tops', 'cotton-jersey', 'slim',
   'Pale blue cotton jersey tee with a ribbed crew neck and a small tonal chest logo.',
   null),

  ('hollister-raglan-tee', 'Hollister Relaxed Raglan Tee', 'Hollister', 'Tees', 'Raglan Tees',
   'tops', 'cotton-jersey', 'relaxed',
   'Cream baseball tee with navy raglan sleeves and a matching ribbed collar.',
   null),

  ('cos-striped-tee', 'COS Oversized Striped Tee', 'COS', 'Tees', 'Crew Tees',
   'tops', 'heavy-cotton-jersey', 'relaxed',
   'Oversized Breton-stripe tee in heavyweight cotton with a patch chest pocket.',
   null),

  ('cos-ribbed-tank', 'COS Ribbed Tank Top', 'COS', 'Tees', 'Tanks',
   'tops', 'cotton-rib', 'slim',
   'Close-fitting grey marl tank in fine ribbed cotton with a scooped neckline.',
   null),

  ('flannel-check-shirt', 'Flannel Check Shirt', 'Uniqlo', 'Shirts', 'Flannel Shirts',
   'tops', 'brushed-flannel', 'regular',
   'Brushed flannel shirt in a soft check, with a chest pocket and curved hem.',
   null),

  ('jwa-striped-oxford', 'JW Anderson Striped Oxford Shirt', 'Uniqlo', 'Shirts', 'Oxford Shirts',
   'tops', 'cotton-oxford', 'relaxed',
   'Relaxed button-down in crisp striped oxford cotton with a single chest pocket.',
   null),

  ('hollister-baggy-jeans', 'Hollister Vintage Baggy Jeans', 'Hollister', 'Jeans', 'Baggy Jeans',
   'bottoms', 'rigid-denim', 'baggy',
   'Wide-leg five-pocket jeans in rigid denim with a faded vintage-wash finish.',
   null),

  ('wide-straight-jeans', 'Wide Straight Jeans', 'Uniqlo', 'Jeans', 'Wide Jeans',
   'bottoms', 'rigid-denim', 'relaxed',
   'Clean wide straight-leg jeans in rigid denim with a high rise and full-length cut.',
   null),

  ('wide-cargo-pants', 'Wide Cargo Pants', 'Uniqlo', 'Pants', 'Cargo Pants',
   'bottoms', 'cotton-twill', 'relaxed',
   'Charcoal cotton twill cargo pants with bellowed side pockets and a wide leg.',
   null),

  ('ultra-stretch-joggers', 'Ultra Stretch Joggers', 'Uniqlo', 'Pants', 'Joggers',
   'bottoms', 'poly-stretch', 'regular',
   'Sage joggers in smooth stretch polyester with an elastic waist and ribbed cuffs.',
   null),

  ('hollister-sweat-shorts', 'Hollister Sweat Shorts', 'Hollister', 'Shorts', 'Sweat Shorts',
   'shorts', 'cotton-fleece', 'regular',
   'Black fleece sweat shorts with a drawstring waist and side-entry pockets.',
   null),

  ('uniqlo-c-sweat-shorts', 'Uniqlo :C Sweat Shorts', 'Uniqlo', 'Shorts', 'Sweat Shorts',
   'shorts', 'cotton-terry', 'relaxed',
   'Light grey French terry shorts with a wide ribbed waistband and relaxed leg.',
   null),

  ('light-wash-denim-shorts', 'Light Wash Denim Shorts', 'Uniqlo', 'Shorts', 'Denim Shorts',
   'shorts', 'washed-denim', 'relaxed',
   'Long-line denim shorts in a pale, broken-in wash with classic five-pocket styling.',
   null),

  ('frisso-printed-shorts', 'F.RISSO Printed Jersey Shorts', 'Uniqlo', 'Shorts', 'Jersey Shorts',
   'shorts', 'poly-jersey', 'relaxed',
   'Knee-length jersey shorts in a diagonal grey print with an elastic waistband.',
   null)
on conflict (style_id) do update
  set title = excluded.title,
      brand = excluded.brand,
      apparel_type = excluded.apparel_type,
      design_type = excluded.design_type,
      category_group = excluded.category_group,
      material_id = excluded.material_id,
      fit_profile = excluded.fit_profile,
      description = excluded.description,
      survey_item_id = excluded.survey_item_id;

-- ---------------------------------------------------------------------------
-- SKU variations (colourway x size)
-- ---------------------------------------------------------------------------
-- size_order 3 is the mid size, and is flagged as the variation a shopper is
-- assumed to have carried into the room.

with colourway (style_id, color_id, image_path, unit_price, size_set) as (
  values
    ('nike-windrunner',         'black',            'items/nike-windbreaker.png',                                    120.00, 'tops'),
    ('adidas-santiago-track',   'colourblock-navy', 'items/adidas-track-jacket.png',                                  85.00, 'tops'),
    ('hollister-rbr-bomber',    'navy',             'items/KIC_332-6016-00083-200_prod2.png',                        110.00, 'tops'),
    ('waterloo-zip-hoodie',     'heather-grey',     'items/waterloo-hoodie.png',                                      65.00, 'tops'),
    ('essential-zip-hoodie',    'black',            'items/black-zip-hoodie.png',                                     55.00, 'tops'),
    ('relaxed-crew-sweatshirt', 'seafoam',          'items/goods_475377_sub14_3x4.png',                               39.90, 'tops'),
    ('chevrolet-graphic-jersey','maroon',           'items/chevrolet-jersey.png',                                     45.00, 'tops'),
    ('hollister-crew-tee',      'light-blue',       'items/KIC_324-26014-00655-210_prod1.png',                        24.95, 'tops'),
    ('hollister-raglan-tee',    'cream-navy',       'items/KIC_324-6333-00614-108_prod1.png',                         29.95, 'tops'),
    ('cos-striped-tee',         'cream-navy',       'items/808fa062a24696cb08e47eb85e9dae3501357691_xxl-1.png',        45.00, 'tops'),
    ('cos-ribbed-tank',         'grey-marl',        'items/b81278a8400e19b92cf46d9bf814d10a13bdebc8_xxl-1.png',        35.00, 'tops'),
    ('flannel-check-shirt',     'rust-check',       'items/goods_486596_sub14_3x4.png',                               29.90, 'tops'),
    ('flannel-check-shirt',     'navy-check',       'items/goods_486604_sub14_3x4.png',                               29.90, 'tops'),
    ('jwa-striped-oxford',      'light-blue',       'items/goods_484904_sub14_3x4.png',                               49.90, 'tops'),
    ('hollister-baggy-jeans',   'medium-indigo',    'items/KIC_331-6272-00751-276_prod1.png',                         69.95, 'bottoms'),
    ('wide-straight-jeans',     'black',            'items/goods_482868_sub14_3x4.png',                               49.90, 'bottoms'),
    ('wide-straight-jeans',     'indigo',           'items/goods_488743_sub14_3x4.png',                               49.90, 'bottoms'),
    ('wide-cargo-pants',        'charcoal',         'items/goods_482936_sub14_3x4.png',                               49.90, 'bottoms'),
    ('ultra-stretch-joggers',   'sage',             'items/goods_485744_sub14_3x4.png',                               39.90, 'bottoms'),
    ('hollister-sweat-shorts',  'black',            'items/KIC_328-6040-00196-902_prod1.png',                         34.95, 'bottoms'),
    ('uniqlo-c-sweat-shorts',   'light-grey',       'items/goods_482758_sub14_3x4.png',                               29.90, 'bottoms'),
    ('light-wash-denim-shorts', 'light-wash',       'items/goods_484209_sub14_3x4.png',                               29.90, 'bottoms'),
    ('frisso-printed-shorts',   'grey-print',       'items/goods_488997_sub14_3x4.png',                               24.90, 'bottoms')
),
size_grid (size_set, size, size_order) as (
  values
    ('tops',    'S',  2),
    ('tops',    'M',  3),
    ('tops',    'L',  4),
    ('bottoms', '30', 2),
    ('bottoms', '32', 3),
    ('bottoms', '34', 4)
)
insert into public.sku_variations
  (variation_id, style_id, sku_code, size, size_order, color_id, unit_price, image_path, is_default)
select
  cw.style_id || '-' || cw.color_id || '-' || lower(sg.size),
  cw.style_id,
  upper(cw.style_id || '-' || cw.color_id || '-' || sg.size),
  sg.size,
  sg.size_order::smallint,
  cw.color_id,
  cw.unit_price,
  cw.image_path,
  sg.size_order = 3
from colourway cw
join size_grid sg on sg.size_set = cw.size_set
on conflict (variation_id) do update
  set style_id = excluded.style_id,
      sku_code = excluded.sku_code,
      size = excluded.size,
      size_order = excluded.size_order,
      color_id = excluded.color_id,
      unit_price = excluded.unit_price,
      image_path = excluded.image_path,
      is_default = excluded.is_default;

-- ---------------------------------------------------------------------------
-- Local store inventory
-- ---------------------------------------------------------------------------
-- Deterministic pseudo-random depth, with a handful of deliberate stock-outs so
-- the Stage 1 availability filter has something to exclude.

insert into public.store_inventory (store_id, variation_id, quantity)
select
  'kw-flagship',
  v.variation_id,
  case
    when v.variation_id in (
      'cos-striped-tee-cream-navy-s',
      'flannel-check-shirt-rust-check-l',
      'wide-straight-jeans-black-34',
      'ultra-stretch-joggers-sage-30',
      'hollister-baggy-jeans-medium-indigo-30',
      'jwa-striped-oxford-light-blue-l',
      'frisso-printed-shorts-grey-print-34'
    ) then 0
    else 2 + (abs(hashtext(v.variation_id)) % 9)
  end
from public.sku_variations v
on conflict (store_id, variation_id) do update
  set quantity = excluded.quantity;
