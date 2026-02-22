-- ============================================================
-- Migration: New Services & Bundles Catalog
-- Date: 2026-02-22
-- ============================================================
-- This script:
--   1) Disables ALL existing session types (active=false, name += ' - old')
--   2) Disables ALL existing bundles       (active=false, name += ' - old')
--   3) Inserts 57 new session types
--   4) Inserts 107 new bundles with their bundle_items
--
-- NOTE: After running this, you must assign doctors to the new
--       session types via the Session Lists (Doctors page) in the app.
--
-- WARNING: Do NOT run this more than once!
-- ============================================================

DO $$
DECLARE
  -- ===================== SESSION TYPE IDs =====================
  -- Physiotherapy
  st_physio         TEXT := gen_random_uuid()::text;
  st_manual         TEXT := gen_random_uuid()::text;
  st_shock          TEXT := gen_random_uuid()::text;
  -- Face
  st_meso_face      TEXT := gen_random_uuid()::text;
  st_prx1           TEXT := gen_random_uuid()::text;
  st_prx2           TEXT := gen_random_uuid()::text;
  st_face_massage   TEXT := gen_random_uuid()::text;
  st_vslim_face     TEXT := gen_random_uuid()::text;
  -- Body
  st_ems20          TEXT := gen_random_uuid()::text;
  st_sport30        TEXT := gen_random_uuid()::text;
  st_sport60        TEXT := gen_random_uuid()::text;
  st_relax30        TEXT := gen_random_uuid()::text;
  st_relax60        TEXT := gen_random_uuid()::text;
  st_deep30         TEXT := gen_random_uuid()::text;
  st_deep30_p30     TEXT := gen_random_uuid()::text;
  st_deep60         TEXT := gen_random_uuid()::text;
  st_deep60_p30     TEXT := gen_random_uuid()::text;
  st_cell60         TEXT := gen_random_uuid()::text;
  st_cell60_p30     TEXT := gen_random_uuid()::text;
  st_cell30         TEXT := gen_random_uuid()::text;
  st_cell30_p30     TEXT := gen_random_uuid()::text;
  st_lymph60        TEXT := gen_random_uuid()::text;
  st_lymph30        TEXT := gen_random_uuid()::text;
  st_reflex30       TEXT := gen_random_uuid()::text;
  st_lpg            TEXT := gen_random_uuid()::text;
  st_vslim40        TEXT := gen_random_uuid()::text;
  st_vslim30        TEXT := gen_random_uuid()::text;
  st_vslim20        TEXT := gen_random_uuid()::text;
  st_presso20       TEXT := gen_random_uuid()::text;
  st_presso40       TEXT := gen_random_uuid()::text;
  st_head_neck40    TEXT := gen_random_uuid()::text;
  st_stretch30      TEXT := gen_random_uuid()::text;
  st_stretch60      TEXT := gen_random_uuid()::text;
  st_gut40          TEXT := gen_random_uuid()::text;
  st_gut40_p20      TEXT := gen_random_uuid()::text;
  st_tmj20          TEXT := gen_random_uuid()::text;
  st_tmj_neck40     TEXT := gen_random_uuid()::text;
  st_wetcup         TEXT := gen_random_uuid()::text;
  -- Laser
  st_l_bikini       TEXT := gen_random_uuid()::text;
  st_l_chest        TEXT := gen_random_uuid()::text;
  st_l_chest_tummy  TEXT := gen_random_uuid()::text;
  st_l_chin         TEXT := gen_random_uuid()::text;
  st_l_face         TEXT := gen_random_uuid()::text;
  st_l_fullarms     TEXT := gen_random_uuid()::text;
  st_l_fullback     TEXT := gen_random_uuid()::text;
  st_l_fulllegs     TEXT := gen_random_uuid()::text;
  st_l_halfarms     TEXT := gen_random_uuid()::text;
  st_l_halfleg      TEXT := gen_random_uuid()::text;
  st_l_lowerback    TEXT := gen_random_uuid()::text;
  st_l_moustache    TEXT := gen_random_uuid()::text;
  st_l_moust_chin   TEXT := gen_random_uuid()::text;
  st_l_tummy        TEXT := gen_random_uuid()::text;
  st_l_underarm     TEXT := gen_random_uuid()::text;
  st_l_upperback    TEXT := gen_random_uuid()::text;
  st_l_fullbody     TEXT := gen_random_uuid()::text;
  -- Meso Body
  st_mb_firm        TEXT := gen_random_uuid()::text;
  st_mb_contour     TEXT := gen_random_uuid()::text;

  -- Reusable bundle ID variable
  v_bid TEXT;

BEGIN
  -- ==========================================================
  -- STEP 1: Disable all existing services & bundles
  -- ==========================================================
  UPDATE "session_types" SET "active" = false, "name" = "name" || ' - old';
  UPDATE "bundles"       SET "active" = false, "name" = "name" || ' - old', "updatedAt" = NOW();

  -- ==========================================================
  -- STEP 2: Insert all new session types (57)
  -- ==========================================================
  INSERT INTO "session_types" ("id", "name", "price", "durationMinutes", "active") VALUES
    -- Physiotherapy
    (st_physio,        'Physiotherapy',                               40,  60, true),
    (st_manual,        'Manual Therapy with Physio',                  50,  60, true),
    (st_shock,         'Shockwave',                                   50,  60, true),
    -- Face
    (st_meso_face,     'Meso Face',                                   60,  60, true),
    (st_prx1,          'PRX 1',                                       85,  60, true),
    (st_prx2,          'PRX 2',                                       85,  60, true),
    (st_face_massage,  'Face Massage',                                50,  60, true),
    (st_vslim_face,    'V Slim Face',                                 50,  60, true),
    -- Body
    (st_ems20,         'EMS 20 min',                                  25,  20, true),
    (st_sport30,       'Sport Session 30 min',                        15,  30, true),
    (st_sport60,       'Sport Session 60 min',                        30,  60, true),
    (st_relax30,       'Relaxing Massage 30 min',                     35,  30, true),
    (st_relax60,       'Relaxing Massage 60 min',                     60,  60, true),
    (st_deep30,        'Deep Tissue Massage 30 min',                  35,  30, true),
    (st_deep30_p30,    'Deep Tissue Massage 30 min + Presso 30 min',  50,  60, true),
    (st_deep60,        'Deep Tissue Massage 60 min',                  60,  60, true),
    (st_deep60_p30,    'Deep Tissue Massage 60 min + Presso 30 min',  75,  90, true),
    (st_cell60,        'Cellulite Massage 60 min',                    60,  60, true),
    (st_cell60_p30,    'Cellulite Massage 60 min + Presso 30 min',    75,  90, true),
    (st_cell30,        'Cellulite Massage 30 min',                    35,  30, true),
    (st_cell30_p30,    'Cellulite Massage 30 min + Presso 30 min',    50,  60, true),
    (st_lymph60,       'Lymphatic Drainage 60 min',                   60,  60, true),
    (st_lymph30,       'Lymphatic Drainage 30 min',                   35,  30, true),
    (st_reflex30,      'Reflexology 30 min',                          50,  30, true),
    (st_lpg,           'LPG',                                         50,  60, true),
    (st_vslim40,       'V Slim 40 min',                               60,  40, true),
    (st_vslim30,       'V Slim 30 min',                               35,  30, true),
    (st_vslim20,       'V Slim 20 min',                               30,  20, true),
    (st_presso20,      'Presso 20 min',                               25,  20, true),
    (st_presso40,      'Presso 40 min',                               40,  40, true),
    (st_head_neck40,   'Head, Shoulder & Neck Massage 40 min',        45,  40, true),
    (st_stretch30,     'Stretching 30 min',                           35,  30, true),
    (st_stretch60,     'Stretching 60 min',                           60,  60, true),
    (st_gut40,         'Gut Massage 40 min (Hot Pad)',                 50,  40, true),
    (st_gut40_p20,     'Gut Massage 40 min + Presso 20 min',          60,  60, true),
    (st_tmj20,         'TMJ Session 20 min',                          35,  20, true),
    (st_tmj_neck40,    'TMJ + Neck 40 min',                           50,  40, true),
    (st_wetcup,        'Wet Cupping',                                 40,  60, true),
    -- Laser
    (st_l_bikini,      'Laser: Bikini',                               30,  60, true),
    (st_l_chest,       'Laser: Chest',                                30,  60, true),
    (st_l_chest_tummy, 'Laser: Chest & Tummy',                       45,  60, true),
    (st_l_chin,        'Laser: Chin',                                 15,  60, true),
    (st_l_face,        'Laser: Face',                                 20,  60, true),
    (st_l_fullarms,    'Laser: Full Arms',                            35,  60, true),
    (st_l_fullback,    'Laser: Full Back',                            50,  60, true),
    (st_l_fulllegs,    'Laser: Full Legs',                            60,  60, true),
    (st_l_halfarms,    'Laser: Half Arms',                            20,  60, true),
    (st_l_halfleg,     'Laser: Half Leg',                             30,  60, true),
    (st_l_lowerback,   'Laser: Lower Back',                           30,  60, true),
    (st_l_moustache,   'Laser: Moustache',                            15,  60, true),
    (st_l_moust_chin,  'Laser: Moustache & Chin',                     35,  60, true),
    (st_l_tummy,       'Laser: Tummy',                                35,  60, true),
    (st_l_underarm,    'Laser: Underarm',                             20,  60, true),
    (st_l_upperback,   'Laser: Upper Back',                           30,  60, true),
    (st_l_fullbody,    'Laser: Full Body',                           100,  60, true),
    -- Meso Body
    (st_mb_firm,       'Meso Body: Firming (1 Ampoule)',              50,  60, true),
    (st_mb_contour,    'Meso Body: Body Contouring',                  60,  60, true);

  -- ==========================================================
  -- STEP 3: Insert bundles + bundle items (107 bundles)
  -- ==========================================================

  -- -------- Physiotherapy --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Physiotherapy: 7 Sessions', 240, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_physio, 7);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Physiotherapy: 15 Sessions', 480, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_physio, 15);

  -- -------- Meso Face --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Meso Face: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_meso_face, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Meso Face: 6 Sessions', 320, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_meso_face, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Meso Face: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_meso_face, 10);

  -- -------- PRX 1 --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'PRX 1: 3 Sessions', 240, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_prx1, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'PRX 1: 6 Sessions', 480, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_prx1, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'PRX 1: 10 Sessions', 750, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_prx1, 10);

  -- -------- PRX 2 --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'PRX 2: 3 Sessions', 240, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_prx2, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'PRX 2: 6 Sessions', 480, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_prx2, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'PRX 2: 10 Sessions', 750, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_prx2, 10);

  -- -------- Face Massage --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Face Massage: 3 Sessions', 140, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_face_massage, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Face Massage: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_face_massage, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Face Massage: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_face_massage, 10);

  -- -------- V Slim Face --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim Face: 3 Sessions', 140, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim_face, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim Face: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim_face, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim Face: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim_face, 10);

  -- -------- EMS 20 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'EMS 20 min: 3 Sessions', 65, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_ems20, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'EMS 20 min: 6 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_ems20, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'EMS 20 min: 10 Sessions', 200, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_ems20, 10);

  -- -------- Sport Session 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Sport Session 30 min: 3 Sessions', 40, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_sport30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Sport Session 30 min: 6 Sessions', 80, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_sport30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Sport Session 30 min: 10 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_sport30, 10);

  -- -------- Sport Session 60 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Sport Session 60 min: 3 Sessions', 80, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_sport60, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Sport Session 60 min: 6 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_sport60, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Sport Session 60 min: 10 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_sport60, 10);

  -- -------- Relaxing Massage 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Relaxing Massage 30 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_relax30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Relaxing Massage 30 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_relax30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Relaxing Massage 30 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_relax30, 10);

  -- -------- Relaxing Massage 60 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Relaxing Massage 60 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_relax60, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Relaxing Massage 60 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_relax60, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Relaxing Massage 60 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_relax60, 10);

  -- -------- Deep Tissue Massage 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue Massage 30 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue Massage 30 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue Massage 30 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep30, 10);

  -- -------- Deep Tissue Massage 30 min + Presso 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue 30 min + Presso 30 min: 3 Sessions', 130, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep30_p30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue 30 min + Presso 30 min: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep30_p30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue 30 min + Presso 30 min: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep30_p30, 10);

  -- -------- Deep Tissue Massage 60 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue Massage 60 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep60, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue Massage 60 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep60, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue Massage 60 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep60, 10);

  -- -------- Deep Tissue Massage 60 min + Presso 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue 60 min + Presso 30 min: 3 Sessions', 200, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep60_p30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue 60 min + Presso 30 min: 6 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep60_p30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Deep Tissue 60 min + Presso 30 min: 10 Sessions', 650, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_deep60_p30, 10);

  -- -------- Cellulite Massage 60 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite Massage 60 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell60, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite Massage 60 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell60, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite Massage 60 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell60, 10);

  -- -------- Cellulite Massage 60 min + Presso 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite 60 min + Presso 30 min: 3 Sessions', 200, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell60_p30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite 60 min + Presso 30 min: 6 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell60_p30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite 60 min + Presso 30 min: 10 Sessions', 650, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell60_p30, 10);

  -- -------- Cellulite Massage 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite Massage 30 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite Massage 30 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite Massage 30 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell30, 10);

  -- -------- Cellulite Massage 30 min + Presso 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite 30 min + Presso 30 min: 3 Sessions', 130, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell30_p30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite 30 min + Presso 30 min: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell30_p30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Cellulite 30 min + Presso 30 min: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_cell30_p30, 10);

  -- -------- Lymphatic Drainage 60 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Lymphatic Drainage 60 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lymph60, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Lymphatic Drainage 60 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lymph60, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Lymphatic Drainage 60 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lymph60, 10);

  -- -------- Lymphatic Drainage 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Lymphatic Drainage 30 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lymph30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Lymphatic Drainage 30 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lymph30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Lymphatic Drainage 30 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lymph30, 10);

  -- -------- Reflexology 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Reflexology 30 min: 3 Sessions', 130, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_reflex30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Reflexology 30 min: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_reflex30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Reflexology 30 min: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_reflex30, 10);

  -- -------- LPG --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'LPG: 3 Sessions', 130, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lpg, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'LPG: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lpg, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'LPG: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_lpg, 10);

  -- -------- V Slim 40 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 40 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim40, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 40 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim40, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 40 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim40, 10);

  -- -------- V Slim 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 30 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 30 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 30 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim30, 10);

  -- -------- V Slim 20 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 20 min: 3 Sessions', 80, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim20, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 20 min: 6 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim20, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'V Slim 20 min: 10 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_vslim20, 10);

  -- -------- Presso 20 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Presso 20 min: 3 Sessions', 65, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_presso20, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Presso 20 min: 6 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_presso20, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Presso 20 min: 10 Sessions', 200, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_presso20, 10);

  -- -------- Presso 40 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Presso 40 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_presso40, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Presso 40 min: 6 Sessions', 200, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_presso40, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Presso 40 min: 10 Sessions', 350, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_presso40, 10);

  -- -------- Head, Shoulder & Neck Massage 40 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Head, Shoulder & Neck 40 min: 3 Sessions', 110, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_head_neck40, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Head, Shoulder & Neck 40 min: 6 Sessions', 220, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_head_neck40, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Head, Shoulder & Neck 40 min: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_head_neck40, 10);

  -- -------- Stretching 30 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Stretching 30 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_stretch30, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Stretching 30 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_stretch30, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Stretching 30 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_stretch30, 10);

  -- -------- Stretching 60 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Stretching 60 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_stretch60, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Stretching 60 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_stretch60, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Stretching 60 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_stretch60, 10);

  -- -------- Gut Massage 40 min (Hot Pad) --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Gut Massage 40 min (Hot Pad): 3 Sessions', 130, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_gut40, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Gut Massage 40 min (Hot Pad): 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_gut40, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Gut Massage 40 min (Hot Pad): 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_gut40, 10);

  -- -------- Gut Massage 40 min + Presso 20 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Gut Massage 40 min + Presso 20 min: 3 Sessions', 150, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_gut40_p20, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Gut Massage 40 min + Presso 20 min: 6 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_gut40_p20, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Gut Massage 40 min + Presso 20 min: 10 Sessions', 500, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_gut40_p20, 10);

  -- -------- TMJ Session 20 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'TMJ Session 20 min: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_tmj20, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'TMJ Session 20 min: 6 Sessions', 180, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_tmj20, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'TMJ Session 20 min: 10 Sessions', 300, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_tmj20, 10);

  -- -------- TMJ + Neck 40 min --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'TMJ + Neck 40 min: 3 Sessions', 130, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_tmj_neck40, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'TMJ + Neck 40 min: 6 Sessions', 250, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_tmj_neck40, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'TMJ + Neck 40 min: 10 Sessions', 400, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_tmj_neck40, 10);

  -- -------- Wet Cupping --------
  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Wet Cupping: 3 Sessions', 100, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_wetcup, 3);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Wet Cupping: 6 Sessions', 200, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_wetcup, 6);

  v_bid := gen_random_uuid()::text;
  INSERT INTO "bundles" ("id","name","price","active","createdAt","updatedAt")
  VALUES (v_bid, 'Wet Cupping: 10 Sessions', 350, true, NOW(), NOW());
  INSERT INTO "bundle_items" ("id","bundleId","sessionTypeId","quantity")
  VALUES (gen_random_uuid()::text, v_bid, st_wetcup, 10);

  -- ========== NO BUNDLES FOR LASER & MESO BODY ==========

  RAISE NOTICE 'Migration complete: 57 services + 107 bundles created, old data disabled.';
END $$;
