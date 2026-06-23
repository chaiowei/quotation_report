-- ProcureAI v5 範例材料資料（M8 初始種子資料）
-- 在 Supabase Dashboard → SQL Editor 執行（可選，提供參考）
-- 或使用 Materials 頁面的「匯入 CSV」功能從 v4 匯出的 CSV 匯入

-- 注意：v4 分類對應 v5：
-- piping → 配管
-- electrical → 儀電
-- civil → 土木
-- structural → 鋼構
-- common → 共用
-- labor → 工費

insert into public.materials (category, name, spec, unit, ref_price, supplier, updated_by) values
-- 配管
('配管', '碳鋼管', '1" SCH40 CS Pipe ASTM A106 Gr.B', 'M', 280, 'Thai Pipe', 'seed'),
('配管', '碳鋼管', '2" SCH40 CS Pipe ASTM A106 Gr.B', 'M', 420, 'Thai Pipe', 'seed'),
('配管', '碳鋼管', '3" SCH40 CS Pipe ASTM A106 Gr.B', 'M', 680, 'Thai Pipe', 'seed'),
('配管', '碳鋼管', '4" SCH40 CS Pipe ASTM A106 Gr.B', 'M', 950, 'Thai Pipe', 'seed'),
('配管', '不鏽鋼管', '2" SCH10 SS304 Pipe ASTM A312', 'M', 1200, '', 'seed'),
('配管', '閥門截止閥', '2" Gate Valve ANSI 150 Carbon Steel', 'EA', 2800, '', 'seed'),
('配管', '閥門球閥',   '2" Ball Valve Full Bore SS316',      'EA', 3200, '', 'seed'),
('配管', '肘管', '2" 90° Elbow SCH40 CS ASTM A234 Gr.WPB', 'EA', 180, '', 'seed'),
('配管', '異徑管', '3" x 2" Reducer Concentric SCH40 CS',  'EA', 320, '', 'seed'),
-- 儀電
('儀電', '壓力錶', '0-10 Bar Pressure Gauge 4" Dial Glycerin', 'EA', 850, '', 'seed'),
('儀電', '溫度計',  'Bimetallic Thermometer 0-200°C 4" Dial',  'EA', 750, '', 'seed'),
('儀電', '流量計',  'Rotameter 0-10 m3/hr',                    'EA', 4500, '', 'seed'),
-- 土木
('土木', '混凝土基礎', 'Concrete Foundation Class C25/30',   'M3', 2800, '', 'seed'),
('土木', '防水工程',   'Waterproofing Membrane 1.5mm',        'M2', 320, '', 'seed'),
-- 鋼構
('鋼構', '型鋼 H 型',  'H-Beam 200x200x8x12 SS400',          'KG', 28, '', 'seed'),
('鋼構', '型鋼 C 型',  'C-Channel 100x50x5 SS400',            'KG', 26, '', 'seed'),
('鋼構', '鋼板',       'Steel Plate 6mm SS400',                'KG', 22, '', 'seed'),
-- 共用
('共用', '螺栓', 'Hex Bolt M16x60 Gr.8.8 HDG',                'SET', 45, '', 'seed'),
('共用', '墊片', 'Spiral Wound Gasket 2" ANSI 150 SS304/GF',  'EA', 380, '', 'seed'),
-- 工費
('工費', '配管安裝', 'Piping Installation including fitting & testing', 'M', 350, '', 'seed'),
('工費', '鋼構安裝', 'Structural Steel Erection',               'TON', 8500, '', 'seed'),
('工費', '保溫工程', 'Insulation 2" Pipe Rock Wool 50mm t',     'M', 280, '', 'seed');
