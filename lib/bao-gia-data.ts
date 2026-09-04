// Dữ liệu báo giá sản phẩm — trích xuất từ 3 file PDF catalogue của CPC1 Hà Nội.
// CẬP NHẬT: khi có báo giá mới, thay số liệu ở đây và thay file PDF trong public/bao-gia/.
// Tổng số dòng sản phẩm: 173.

export interface SanPham {
  nhom: string;
  ten: string;
  hoatChat: string;
  quyCach: string;
  gia: string;
}

export interface Catalog {
  id: string;
  ten: string;
  moTa: string;
  pdf: string;
  cover: string;
  kichThuoc: string;
  sanPham: SanPham[];
}

export const CATALOGS: Catalog[] = [
  {
    "id": "san-khoa-nhi",
    "ten": "Báo giá ETC – Sản khoa & Nhi",
    "moTa": "Sản khoa, phụ khoa, chuyên khoa nhi, tiêu hoá, dung dịch vệ sinh, chăm sóc răng miệng…",
    "pdf": "/bao-gia/bao-gia-san-khoa-nhi.pdf",
    "cover": "/bao-gia/cover-san-khoa-nhi.jpg",
    "kichThuoc": "2,9 MB",
    "sanPham": [
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Hemastop",
        "hoatChat": "Carboprost tromethamin tương đương carboprost 250 mcg",
        "quyCach": "Hộp x 1 lọ x 1ml",
        "gia": "290.000 VNĐ/lọ"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Hemotocin",
        "hoatChat": "Mỗi lọ (1 ml) chứa 100 mcg carbetocin",
        "quyCach": "Hộp 10 lọ x 1ml",
        "gia": "346.500 VNĐ/lọ"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Phytok",
        "hoatChat": "Phytomenadion",
        "quyCach": "Hộp 1 lọ x 2ml",
        "gia": "88.200 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Phytok",
        "hoatChat": "Phytomenadion",
        "quyCach": "Hộp 1 lọ x 5ml",
        "gia": "150.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Atosiban-BFS",
        "hoatChat": "Atosiban 7,5mg/ml",
        "quyCach": "Hộp 1 lọ x 5ml",
        "gia": "1.575.000 VNĐ/lọ"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "BFS-Nicardipin",
        "hoatChat": "Nicardipin hydroclorid 10mg/10ml",
        "quyCach": "Hộp 1 lọ x 10 ml",
        "gia": "84.000 VNĐ/lọ"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Ergome-BFS",
        "hoatChat": "Methylergometrin maleat 0,2mg/ml",
        "quyCach": "Hộp 10 ống x 1ml",
        "gia": "11.550 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Lidocain-BFS",
        "hoatChat": "Lidocain hydroclorid 200mg/10ml",
        "quyCach": "Hộp 20 lọ x 10ml",
        "gia": "15.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "Bupi-BFS Heavy",
        "hoatChat": "Bupivacain hydroclorid 5 mg",
        "quyCach": "Hộp 10 lọ x 2ml",
        "gia": "16.800 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "BFS-Ciprofloxacin",
        "hoatChat": "Ciprofloxacin 200mg/10ml",
        "quyCach": "Hộp 10 ống x 10ml",
        "gia": "55.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tiêm, uống công nghệ BFS",
        "ten": "BFS-Dexa",
        "hoatChat": "Dexamethason phosphat (dưới dạng dexamethason natri phosphat) 10mg",
        "quyCach": "Hộp 10 lọ x 1ml",
        "gia": "40.000 VNĐ/ống"
      },
      {
        "nhom": "Viên đặt dạng sáp, thụt âm đạo",
        "ten": "Gravia Sup 500mg",
        "hoatChat": "Clotrimazol 500 mg/viên",
        "quyCach": "Hộp 1 vỉ x 7 viên đặt",
        "gia": "53.000 VNĐ/viên"
      },
      {
        "nhom": "Viên đặt dạng sáp, thụt âm đạo",
        "ten": "pH. Balance",
        "hoatChat": "Acid lactic, Natri lactat",
        "quyCach": "Hộp 1 vỉ x 7 viên đặt",
        "gia": "10.000 VNĐ/viên"
      },
      {
        "nhom": "Viên đặt dạng sáp, thụt âm đạo",
        "ten": "Vagidequa",
        "hoatChat": "Dequalinium hydrochloride 10 mg/viên",
        "quyCach": "Hộp 1 vỉ x 6 viên đặt",
        "gia": "15.000 VNĐ/viên"
      },
      {
        "nhom": "Viên đặt dạng sáp, thụt âm đạo",
        "ten": "Proges sup 400",
        "hoatChat": "Progesteron 400mg",
        "quyCach": "Hộp x 3 vỉ x 5 viên",
        "gia": "27.100 VNĐ/viên"
      },
      {
        "nhom": "Viên đặt dạng sáp, thụt âm đạo",
        "ten": "Novofenti",
        "hoatChat": "Fenticonazol nitrat 200 mg",
        "quyCach": "Hộp 1 vỉ x 3 viên nang mềm đặt âm đạo",
        "gia": "60.000 VNĐ/hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Baby Intimate Gel",
        "hoatChat": "Nước tinh khiết, Inulin, Aloe Vera Extract, Green Tea Extract, Chamomile Extract, Dexpanthenol, Glycerin, Panthenol...",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Bio Intimate Gel",
        "hoatChat": "Lactobacillus Ferment Extract, Dexpanthenol, Inulin, Allantoin, Aloe vera extract, Acid lactic...",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Protect Intimate Gel",
        "hoatChat": "Dequalinium chloride, Witch Hazel Extract, Chamomile Extract, Thyme Extract",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "139.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Mois Intimate Gel",
        "hoatChat": "Nước tinh khiết, WH Complex (Sodium hyaluronate, Lactic Acid, Glycerin), Aloe Vera Extract, Vitamin E...",
        "quyCach": "Hộp 1 lọ x 200ml",
        "gia": "98.000 VNĐ/lọ"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Intimate Gel for men",
        "hoatChat": "Lonicera Japonica extract (Kim ngân), Witch Hazel Extract, Aloe Vera Extract, Green Tea Extract, Chamomile Extract, Nicotinamide",
        "quyCach": "Hộp 1 lọ x 135ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Intimate Gel",
        "hoatChat": "Nước tinh khiết, Cocamidopropyl Betaine, Glycerin, Propylen Glycol, Dexpanthenol, Acid lactic, Thyme Extract...",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "98.000 VNĐ/hộp"
      },
      {
        "nhom": "Sản phẩm bổ sung dạng viên nang mềm",
        "ten": "Vital Pro",
        "hoatChat": "Canci, magne, vitamin C, nhân sâm, Sắt II sunlfat, vitamin E, Đồng II sulfat, Kẽm sulfat, B6, B2, B1, B12, A, Biotin, Folic acid, Natri selen",
        "quyCach": "Hộp 1 lọ x 30 viên / Hộp 1 lọ x 60 viên",
        "gia": "Lọ 30v: 3.600 VNĐ/viên · Lọ 60v: 3.300 VNĐ/viên"
      },
      {
        "nhom": "Sản phẩm bổ sung dạng viên nang mềm",
        "ten": "Novoliver",
        "hoatChat": "Arginin hydroclorid (L-Arginin hydroclorid) 500 mg",
        "quyCach": "Hộp 1 lọ x 30 viên / Hộp 1 lọ x 60 viên",
        "gia": "Lọ 30v: 2.800 VNĐ/viên · Lọ 60v: 2.500 VNĐ/viên"
      },
      {
        "nhom": "Sản phẩm bổ sung dạng viên nang mềm",
        "ten": "Premical softcap",
        "hoatChat": "Calci hydroxyapatid 385 mg, Zinc oxid 5,6 mg, Magie oxid 125 mg, Vitamin D3 100 IU, Vitamin K2 10 mcg, Fructose oligo saccharide 50 mg, Plum juice powder 50 mg, Collagen peptides 50 mg",
        "quyCach": "Hộp 1 lọ x 30 viên",
        "gia": "3.600 VNĐ/viên"
      },
      {
        "nhom": "Sản phẩm bổ sung dạng viên nang mềm",
        "ten": "Diclodat sup",
        "hoatChat": "Natri diclofenac 25 mg",
        "quyCach": "Hộp 2 vỉ x 5 viên",
        "gia": "75.000 VNĐ/hộp"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Companity",
        "hoatChat": "Lactulose",
        "quyCach": "Hộp 20 gói x 15ml",
        "gia": "4.500 VNĐ/gói"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Companity",
        "hoatChat": "Lactulose",
        "quyCach": "Hộp 20 ống x 15ml",
        "gia": "3.300 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Metovomit",
        "hoatChat": "Metoclopramid hydroclorid 1 mg",
        "quyCach": "Hộp 1 lọ x 30ml",
        "gia": "48.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Stiprol",
        "hoatChat": "Glycerol 2,25g/3g",
        "quyCach": "Hộp 6 tuýp x 9g",
        "gia": "7.000 VNĐ/tuýp"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Catolis",
        "hoatChat": "Ursodeoxycholic acid 150mg",
        "quyCach": "Hộp 4 vỉ x 15 viên",
        "gia": "4.000 VNĐ/viên"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Kalira",
        "hoatChat": "Calcium polystyren sulfonate 5g",
        "quyCach": "Hộp 20 gói x 5g",
        "gia": "14.700 VNĐ/gói"
      },
      {
        "nhom": "Sản phẩm tiêu hoá",
        "ten": "Metroral",
        "hoatChat": "Metronidazol 200 mg/5 ml (dưới dạng metronidazol benzoat)",
        "quyCach": "Hộp 1 lọ x 60ml",
        "gia": "99.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Fogyma",
        "hoatChat": "Fe (III) dạng phức hợp Sắt (III) hydroxyd polymaltose 50 mg",
        "quyCach": "Hộp 1 lọ x 120ml",
        "gia": "120.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Progermila",
        "hoatChat": "Bacillus Clausii 2x10^9 CFU/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "109.200 VNĐ/hộp"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Pyridol",
        "hoatChat": "Magnesium lactat dihydrat 186 mg, Magnesium pidolat 936 mg, Pyridoxin hydroclorid 10 mg",
        "quyCach": "Hộp 20 lọ x 10ml",
        "gia": "126.000 VNĐ/hộp"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Pyridol",
        "hoatChat": "Magie lactac dihydrat 186 mg, Magie pidolat 936 mg, Pyridoxin hydroclorid 10 mg",
        "quyCach": "Hộp 1 lọ x 120ml",
        "gia": "120.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Pamol 250",
        "hoatChat": "Paracetamol 250mg/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "4.500 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Pamol 120",
        "hoatChat": "Paracetamol 120mg/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "3.780 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "PRED-NEW",
        "hoatChat": "Prednisolon 5 mg/5 ml (dưới dạng prednisolon natri phosphat)",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "3.150 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Duchat",
        "hoatChat": "Calci (calci lactat pentahydrat 66,66mg) 8,67 mg, Thiamin HCl 0,2 mg, Riboflavin sodium phosphat 0,23 mg, Pyridoxin HCl 0,4 mg, Cholecalciferol 1 mg, Alpha tocopheryl acetat 1 mg, Nicotinamid 1,33 mg, Dexpanthenol 0,67 mg, Lysin HCl 20 mg",
        "quyCach": "Hộp 1 lọ x 120ml",
        "gia": "110.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Dexasol",
        "hoatChat": "Dexamethason 0,4 mg (dưới dạng Dexamethason natri phosphat)",
        "quyCach": "Hộp 1 lọ x 30ml",
        "gia": "50.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Desone",
        "hoatChat": "Desloratadin 2 mg (0,5 mg/ml)",
        "quyCach": "Hộp 20 ống x 5ml",
        "gia": "7.000 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Desone 30ml",
        "hoatChat": "Desloratadin 0,5 mg/ml",
        "quyCach": "Hộp 1 lọ x 30ml",
        "gia": "45.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Mucome Baby Spray",
        "hoatChat": "Xylometazolin hydroclorid 0,05 %",
        "quyCach": "Hộp 1 lọ x 10ml",
        "gia": "35.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "SIX.am",
        "hoatChat": "Rotundin sulfat, dịch chiết hoa nghệ tây",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "14.000 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Zentokid C&F",
        "hoatChat": "Cao khô lá húng chanh 37,5 mg, cao khô lá tía tô 37,5 mg, cao khô quả cơm cháy 37,5 mg, cao khô lá thường xuân 30 mg, cao khô rễ phòng phong 15 mg, Immunepath-IP (PT) 7,5 mg, Lactobacillus paracasei, Maltodextrin",
        "quyCach": "Hộp 1 lọ x 20 ml",
        "gia": "88.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Zentokid ZinC",
        "hoatChat": "Vitamin C (Natri-L-ascorbat) 50 mg, Zinc gluconate (tương đương 5,06 mg Kẽm) 35,053 mg",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5 ml",
        "gia": "5.500 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Zentokid",
        "hoatChat": "L-argininen L-aspartate, Lysin hydrochloride, Springer, Hops Flower, Valerian, Artichoke, B1, PP, B6",
        "quyCach": "Kiện 132 hộp x 10 ống",
        "gia": "18.000 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Zentokid D3K2",
        "hoatChat": "Cholecalciferol 12.000 IU, Vitamin K2-MK7 (Menaquinone-7) 300 µg",
        "quyCach": "Hộp 1 lọ x 5ml",
        "gia": "99.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Nupigin Forte",
        "hoatChat": "Piracetam 333,3 mg/ml",
        "quyCach": "Hộp 1 lọ x 125 ml",
        "gia": "252.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Premical D3K2",
        "hoatChat": "Calcium lactat 290 mg, Calcium glucoheptonat 450 mg, Vitamin D3 400 IU, Vitamin K2 22,5 mcg, Vitamin PP 5 mg",
        "quyCach": "Hộp 4 vỉ x 5 ống 10 ml",
        "gia": "4.950 VNĐ/ống"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Smartk Id",
        "hoatChat": "Beta glucan 2250 mg, Yến mạch 1500 mg, Echinacea purpurea extract 2250 mg, Kẽm gluconat 25mg, Acid ascorbic 1250 mg",
        "quyCach": "Hộp x 1 lọ x 150ml",
        "gia": "88.000 VNĐ/lọ"
      },
      {
        "nhom": "Sản phẩm chuyên khoa Nhi",
        "ten": "Nimovaso Sol",
        "hoatChat": "Nimodipin 30mg/10ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 10ml",
        "gia": "315.000 VNĐ/hộp"
      },
      {
        "nhom": "Chăm sóc sức khoẻ răng miệng",
        "ten": "Laforin - 500ml",
        "hoatChat": "Chlorhexidine digluconate 0,12%, Sodium fluoride 0,05%",
        "quyCach": "Hộp 1 lọ x 500ml",
        "gia": "94.500 VNĐ/lọ"
      },
      {
        "nhom": "Chăm sóc sức khoẻ răng miệng",
        "ten": "Laforin Daily",
        "hoatChat": "Thymol, Menthol, methyl salicylat, Kẽm gluconat, Natri florid, Natri hexametaphosphat, Natri benzoat, D-Panthenol",
        "quyCach": "Hộp 1 lọ x 500ml",
        "gia": "55.650 VNĐ/lọ"
      },
      {
        "nhom": "Chăm sóc sức khoẻ răng miệng",
        "ten": "Laforin baby hương cam",
        "hoatChat": "Propolis extract 0,1 mg, Sodium chloride 9,0 mg, Sodium fluoride 0,2 mg, Green tea extract 0,5 mg",
        "quyCach": "Hộp 1 lọ 350ml",
        "gia": "55.650 VNĐ/Hộp"
      },
      {
        "nhom": "Chăm sóc sức khoẻ răng miệng",
        "ten": "Laforin baby hương đào",
        "hoatChat": "Propolis extract 0,1 mg, Sodium chloride 9,0 mg, Sodium fluoride 0,2 mg, Green tea extract 0,5 mg",
        "quyCach": "Hộp 1 lọ 350ml",
        "gia": "55.650 VNĐ/Hộp"
      },
      {
        "nhom": "Chăm sóc sức khoẻ răng miệng",
        "ten": "Laforin baby hương ổi",
        "hoatChat": "Propolis extract 0,1 mg, Sodium chloride 9,0 mg, Sodium fluoride 0,2 mg, Green tea extract 0,5 mg",
        "quyCach": "Hộp 1 lọ 350ml",
        "gia": "55.650 VNĐ/Hộp"
      }
    ]
  },
  {
    "id": "gmhs",
    "ten": "Catalogue nhóm hàng GMHS",
    "moTa": "Gây tê – gây mê, giãn cơ, tim mạch, chống nhiễm khuẩn, giải độc, hồi sức, bù điện giải…",
    "pdf": "/bao-gia/bao-gia-gmhs.pdf",
    "cover": "/bao-gia/cover-gmhs.jpg",
    "kichThuoc": "2,4 MB",
    "sanPham": [
      {
        "nhom": "Thuốc gây tê - gây mê",
        "ten": "Levobupi-BFS 50 mg",
        "hoatChat": "Levobupivacain 50mg/10ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "84.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc gây tê - gây mê",
        "ten": "Lidocain-BFS 200mg",
        "hoatChat": "Lidocain hydroclorid 200mg/10ml",
        "quyCach": "Hộp 20 ống x 10 ml",
        "gia": "15.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc gây tê - gây mê",
        "ten": "Liproin",
        "hoatChat": "Lidocain 25mg/g, Prilocain 25mg/g",
        "quyCach": "Hộp 1 tuýp 5g",
        "gia": "36.500 VNĐ/tuýp"
      },
      {
        "nhom": "Thuốc gây tê - gây mê",
        "ten": "Propofol-bfs",
        "hoatChat": "Propofol 10 mg/ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "54.600 VNĐ/ống"
      },
      {
        "nhom": "Thuốc gây tê - gây mê",
        "ten": "Ropicain-Bfs",
        "hoatChat": "Ropivacain hydrochlorid 5 mg/ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "90.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc gây tê - gây mê",
        "ten": "Demedin-BFS",
        "hoatChat": "Dexmedetomidin 0,1 mg/ml",
        "quyCach": "Hộp 1 lọ x 2 ml",
        "gia": "Liên hệ"
      },
      {
        "nhom": "Thuốc giãn cơ - giải giãn cơ",
        "ten": "BFS-Neostigmine",
        "hoatChat": "Neostigmin metylsulfat 0,25 mg/ml",
        "quyCach": "Hộp 20 ống x 1 ml",
        "gia": "5.460 VNĐ/ống"
      },
      {
        "nhom": "Thuốc giãn cơ - giải giãn cơ",
        "ten": "Rocuronium-BFS",
        "hoatChat": "Rocuronium bromid 50mg/5ml",
        "quyCach": "Hộp 5 ống x 5 ml",
        "gia": "67.200 VNĐ/ống"
      },
      {
        "nhom": "Thuốc giãn cơ - giải giãn cơ",
        "ten": "BFS-Atracu",
        "hoatChat": "Atracurium besylat 10 mg",
        "quyCach": "Hộp 20 ống x 1 ml",
        "gia": "80.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc giãn cơ - giải giãn cơ",
        "ten": "Sugam-BFS",
        "hoatChat": "Sugammadex 100mg/ml",
        "quyCach": "Hộp 10 ống x 2 ml",
        "gia": "1.575.000 VNĐ/ống"
      },
      {
        "nhom": "Chống dị ứng, quá mẫn",
        "ten": "Adrenaline-BFS 5mg",
        "hoatChat": "Epinephrin (adrenalin) 5mg/5ml",
        "quyCach": "Hộp 10 ống x 5 ml",
        "gia": "25.000 VNĐ/ống"
      },
      {
        "nhom": "Dung dịch điện giải, tiêm truyền",
        "ten": "Kama-BFS",
        "hoatChat": "Magnesi aspartat 400mg/10ml, Kali aspartat 452mg/10ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "16.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc giải độc, dùng khi ngộ độc",
        "ten": "BFS-Noradrenalin 10mg",
        "hoatChat": "Nor-epinephrin (Nor-adrenalin) 10 mg/10 ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "145.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc giải độc, dùng khi ngộ độc",
        "ten": "BFS-Noradrenalin 4mg",
        "hoatChat": "Nor-epinephrin (Nor-adrenalin) 4 mg/4 ml",
        "quyCach": "Hộp 10 ống x 4 ml",
        "gia": "105.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nhiễm khuẩn, nấm",
        "ten": "Metroral",
        "hoatChat": "Metronidazol 200 mg/5 ml (dưới dạng metronidazol benzoat)",
        "quyCach": "Hộp 1 lọ x 60ml",
        "gia": "99.000 VNĐ/hộp"
      },
      {
        "nhom": "Thuốc chống nhiễm khuẩn, nấm",
        "ten": "Bfs-Ciprofloxacin",
        "hoatChat": "Ciprofloxacin 200mg/10ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "55.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nhiễm khuẩn, nấm",
        "ten": "Levof-BFS 250mg",
        "hoatChat": "Levofloxacin 250mg/10ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "44.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nhiễm khuẩn, nấm",
        "ten": "Levof-BFS 500mg",
        "hoatChat": "Levofloxacin 500mg/10ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "88.200 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nhiễm khuẩn, nấm",
        "ten": "Line–BFS 600 mg",
        "hoatChat": "Linezolid 600 mg/10 ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "195.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nhiễm khuẩn, nấm",
        "ten": "Fluco-SB",
        "hoatChat": "Fluconazol 2mg/ml",
        "quyCach": "Hộp 1 túi x 50 ml",
        "gia": "94.000 VNĐ/túi"
      },
      {
        "nhom": "Thuốc tác dụng đối với máu",
        "ten": "Fogyma",
        "hoatChat": "Sắt nguyên tố (dưới dạng phức hợp Sắt (III) hydroxyd polimantose) 50mg",
        "quyCach": "Hộp 4 vỉ x 5 ống x 10 ml",
        "gia": "7.500 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tác dụng đối với máu",
        "ten": "Fogyma",
        "hoatChat": "Sắt nguyên tố (dưới dạng phức hợp Sắt (III) hydroxyd polimantose)",
        "quyCach": "Hộp 1 lọ x 120 ml",
        "gia": "120.000 VNĐ/lọ"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "BFS-Adenosin",
        "hoatChat": "Adenosine 3mg/1ml",
        "quyCach": "Hộp 1 ống x 2 ml",
        "gia": "800.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "BFS-Amiron",
        "hoatChat": "Amiodaron hydroclorid 150mg/3ml",
        "quyCach": "Hộp 10 ống x 3 ml",
        "gia": "24.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "BFS-Nicardipin",
        "hoatChat": "Nicardipin hydroclorid 10mg/10ml",
        "quyCach": "Hộp 20 ống x 10 ml",
        "gia": "84.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "Digoxin-BFS",
        "hoatChat": "Digoxin 0,25mg/1ml",
        "quyCach": "Hộp 10 ống x 1 ml",
        "gia": "16.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "Dobutamin-BFS",
        "hoatChat": "Dobutamin 250mg/5ml",
        "quyCach": "Hộp 10 ống x 5 ml",
        "gia": "55.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "DoBu SB",
        "hoatChat": "Dobutamin 250mg/250ml",
        "quyCach": "Hộp 1 túi x 250 ml",
        "gia": "100.000 VNĐ/túi"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "Milrinone-BFS",
        "hoatChat": "Milrinon 10mg/10ml",
        "quyCach": "Hộp 1 lọ x 10 ml",
        "gia": "1.260.000 VNĐ/ống"
      },
      {
        "nhom": "Thuốc tim mạch",
        "ten": "Nimovaso Sol",
        "hoatChat": "Nimodipin 30mg/10ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 10ml",
        "gia": "15.750 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nôn",
        "ten": "Nausazy 4mg",
        "hoatChat": "Ondansetron 4mg/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "14.700 VNĐ/ống"
      },
      {
        "nhom": "Thuốc chống nôn",
        "ten": "BFS-Grani",
        "hoatChat": "Granisetron hydroclorid 1,12mg/1ml",
        "quyCach": "Hộp 10 ống x 1 ml",
        "gia": "50.400 VNĐ/ống"
      },
      {
        "nhom": "Men vi sinh - tiêu hoá",
        "ten": "Progermila",
        "hoatChat": "Bacillus clausii 2x10^9",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "109.200 VNĐ/hộp"
      },
      {
        "nhom": "Thúc đẻ, cầm máu sau đẻ, chống đẻ non",
        "ten": "Hemotocin",
        "hoatChat": "Carbetocin 100mcg/ml",
        "quyCach": "Hộp 10 ống x 1 ml",
        "gia": "346.500 VNĐ/ống"
      },
      {
        "nhom": "Thúc đẻ, cầm máu sau đẻ, chống đẻ non",
        "ten": "Hemastop",
        "hoatChat": "Carboprost tromethamin 332mcg/1ml",
        "quyCach": "Hộp 10 ống x 1 ml",
        "gia": "290.000 VNĐ/ống"
      },
      {
        "nhom": "Thúc đẻ, cầm máu sau đẻ, chống đẻ non",
        "ten": "Atosiban-BFS",
        "hoatChat": "Atosiban 7,5mg/ml",
        "quyCach": "Hộp 1 ống x 5 ml",
        "gia": "1.575.000 VNĐ/ống"
      },
      {
        "nhom": "Khoáng chất và vitamin",
        "ten": "Trainfu",
        "hoatChat": "Sắt clorid, Kẽm clorid, Mangan clorid, Đồng clorid, Crôm clorid, Natri molypdat, Natri selenid, Natri fluorid, Kali iodid (dung dịch vi lượng)",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "29.400 VNĐ/ống"
      },
      {
        "nhom": "Khác",
        "ten": "Zenace",
        "hoatChat": "Acetylcystein 1000mg/10ml",
        "quyCach": "Hộp 10 ống x 10 ml",
        "gia": "12.600 VNĐ/ống"
      },
      {
        "nhom": "Chăm sóc răng miệng",
        "ten": "Laforin Curespray",
        "hoatChat": "Chlorhexidin digluconat 0,2% w/v",
        "quyCach": "Hộp 1 lọ x 30ml",
        "gia": "79.000 VNĐ/lọ"
      },
      {
        "nhom": "Thực phẩm bổ sung",
        "ten": "Thạch dinh dưỡng Zodiac",
        "hoatChat": "Bổ sung vitamin nhóm B (B1, B2, B6, PP), pro-vitamin B5, vitamin C; Immunepath-IP, Lactobacillus paracasei",
        "quyCach": "Túi 12 gói x 15g",
        "gia": "24.640 VNĐ/túi"
      },
      {
        "nhom": "Thực phẩm bổ sung",
        "ten": "Thạch Zodiac",
        "hoatChat": "Bổ sung vitamin nhóm B (B1, B2, B6, PP), pro-vitamin B5, vitamin C; Immunepath-IP, Lactobacillus paracasei",
        "quyCach": "Túi 1 kg",
        "gia": "115.000 VNĐ/túi"
      },
      {
        "nhom": "Chăm sóc răng miệng",
        "ten": "Laforin 500ml",
        "hoatChat": "Chlorhexidine digluconate 0,12%, Sodium fluoride 0,05%",
        "quyCach": "Hộp 1 lọ 500ml",
        "gia": "94.500 VNĐ/lọ"
      },
      {
        "nhom": "Chăm sóc răng miệng",
        "ten": "Laforin baby hương cam",
        "hoatChat": "Propolis extract 0,1 mg, Sodium chloride 9,0 mg, Sodium fluoride 0,2 mg, Green tea extract 0,5 mg",
        "quyCach": "Hộp 1 lọ 350ml",
        "gia": "55.650 VNĐ/lọ"
      },
      {
        "nhom": "Chăm sóc răng miệng",
        "ten": "Laforin baby hương đào",
        "hoatChat": "Propolis extract 0,1 mg, Sodium chloride 9,0 mg, Sodium fluoride 0,2 mg, Green tea extract 0,5 mg",
        "quyCach": "Hộp 1 lọ 350ml",
        "gia": "55.650 VNĐ/lọ"
      },
      {
        "nhom": "Chăm sóc răng miệng",
        "ten": "Laforin baby hương ổi",
        "hoatChat": "Propolis extract 0,1 mg, Sodium chloride 9,0 mg, Sodium fluoride 0,2 mg, Green tea extract 0,5 mg",
        "quyCach": "Hộp 1 lọ 350ml",
        "gia": "55.650 VNĐ/lọ"
      },
      {
        "nhom": "Bù điện giải",
        "ten": "Glukan hương tăng lực",
        "hoatChat": "Glucose, natri citrat 290 mg, Natri clorid 260 mg, Kali clorid, Immunepath-IP, Lactobacillus paracasei, Kẽm (kẽm gluconat) 1 mg",
        "quyCach": "Thùng 24 chai x 265ml",
        "gia": "216.000 VNĐ/thùng"
      },
      {
        "nhom": "Bù điện giải",
        "ten": "Glukan hương dâu",
        "hoatChat": "Glucose, natri citrat 290 mg, Natri clorid 260 mg, Kali clorid, Immunepath-IP, Lactobacillus paracasei, Kẽm (kẽm gluconat) 1 mg",
        "quyCach": "Thùng 24 chai x 265ml",
        "gia": "216.000 VNĐ/thùng"
      },
      {
        "nhom": "Bù điện giải",
        "ten": "Glukan hương cam",
        "hoatChat": "Glucose, natri citrat 290 mg, Natri clorid 260 mg, Kali clorid, Immunepath-IP, Lactobacillus paracasei, Kẽm (kẽm gluconat) 1 mg",
        "quyCach": "Thùng 24 chai x 265ml",
        "gia": "216.000 VNĐ/thùng"
      },
      {
        "nhom": "Bù điện giải",
        "ten": "Glukan hương vải",
        "hoatChat": "Glucose, natri citrat 290 mg, Natri clorid 260 mg, Kali clorid, Immunepath-IP, Lactobacillus paracasei, Kẽm (kẽm gluconat) 1 mg",
        "quyCach": "Thùng 24 chai x 265ml",
        "gia": "216.000 VNĐ/thùng"
      }
    ]
  },
  {
    "id": "tieu-hoa",
    "ten": "Báo giá ETC – Tiêu hoá",
    "moTa": "Tiêu hoá, gan mật – tiết niệu, trĩ, phụ khoa, tai mũi họng, thạch ăn liền, bổ sung…",
    "pdf": "/bao-gia/bao-gia-tieu-hoa.pdf",
    "cover": "/bao-gia/cover-tieu-hoa.jpg",
    "kichThuoc": "2,3 MB",
    "sanPham": [
      {
        "nhom": "Tiêu hoá",
        "ten": "Progermila",
        "hoatChat": "Bacillus Clausii 2x10^9 CFU/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "5.460 VNĐ/ống"
      },
      {
        "nhom": "Tiêu hoá",
        "ten": "Bixazol",
        "hoatChat": "Sulfamethoxazol + Trimethoprim (200mg + 40mg)/10ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 10ml",
        "gia": "5.000 VNĐ/ống"
      },
      {
        "nhom": "Tiêu hoá",
        "ten": "Hantacid",
        "hoatChat": "Magnesi hydroxyd 195mg, Nhôm hydroxyd 220mg, Simethicon 25mg",
        "quyCach": "Hộp 30 gói x 10ml",
        "gia": "4.950 VNĐ/gói"
      },
      {
        "nhom": "Tiêu hoá",
        "ten": "Tranfast",
        "hoatChat": "Macrogol 4000, Natri sulfat, Natri bicarbonat, Natri clorid, Kali clorid",
        "quyCach": "Hộp 10 gói x 73,69g",
        "gia": "29.500 VNĐ/gói"
      },
      {
        "nhom": "Tiêu hoá",
        "ten": "Resazine",
        "hoatChat": "Mesalazin (mesalamin) 10mg/1ml",
        "quyCach": "Hộp 1 lọ x 10ml",
        "gia": "185.000 VNĐ/lọ"
      },
      {
        "nhom": "Trĩ - hậu môn",
        "ten": "Retasol",
        "hoatChat": "Sorbitol 50%, Natri citrat 7,2%",
        "quyCach": "Hộp 6 tuýp x 8g",
        "gia": "15.500 VNĐ/tuýp"
      },
      {
        "nhom": "Trĩ - hậu môn",
        "ten": "Rectocare",
        "hoatChat": "Prednisolon acetat, Lidocain, Allantoin, Vitamin E acetat",
        "quyCach": "Hộp 2 vỉ x 5 viên đặt",
        "gia": "15.000 VNĐ/viên"
      },
      {
        "nhom": "Trĩ - hậu môn",
        "ten": "Mogarna Cream",
        "hoatChat": "Rutin, Lidocain, Phenylephrin hydrochlorid, Vitamin E acetat, Amoni glycyrrhizinat, Allantoin",
        "quyCach": "Hộp 1 tuýp x 15g",
        "gia": "95.000 VNĐ/tuýp"
      },
      {
        "nhom": "Trĩ - hậu môn",
        "ten": "Mogarna Spray",
        "hoatChat": "Lidocain, Phenylephrin HCl, Mono-Ammonium Glycyrrhizinat, dịch chiết lô hội, Allantoin, Natri Hyaluronat, Tocopheryl Acetat, Menthol, Glycerin",
        "quyCach": "Hộp 1 lọ x 30ml",
        "gia": "210.000 VNĐ/lọ"
      },
      {
        "nhom": "Trĩ - hậu môn",
        "ten": "Trio",
        "hoatChat": "Diosmin, Escin (Chiết xuất Hạt dẻ ngựa), Hesperidin, Rutin, Chiết xuất hoa cúc (Chamomile extract)",
        "quyCach": "Hộp 2 vỉ x 15 viên",
        "gia": "3.000 VNĐ/viên"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Catolis",
        "hoatChat": "Ursodeoxycholic acid 150mg",
        "quyCach": "Hộp 4 vỉ x 15 viên",
        "gia": "4.000 VNĐ/viên"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Actiso Viet",
        "hoatChat": "Cao Actiso 280mg/10ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 10ml",
        "gia": "4.000 VNĐ/ống"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Pargine",
        "hoatChat": "Arginin HCl 1000mg/10ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 10ml",
        "gia": "5.500 VNĐ/ống"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Diasyl softcap",
        "hoatChat": "Silymarin phytosome 75mg, Cao Kim ngân 90mg, Cao Diệp hạ châu 20mg, Mono-Ammonium Glycyrrhizinate 6mg, Vitamin B2 1,5mg, Vitamin B6 1,5mg, Vitamin PP 6mg",
        "quyCach": "Hộp 1 lọ x 60 viên",
        "gia": "4.150 VNĐ/viên"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Kim tiền thảo AGP 400",
        "hoatChat": "Cao khô kim tiền thảo 400mg",
        "quyCach": "Hộp 1 lọ x 60 viên",
        "gia": "2.450 VNĐ/viên"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Kim tiền thảo AGP 480",
        "hoatChat": "Cao khô kim tiền thảo 480mg/2g",
        "quyCach": "Hộp 30 gói x 2g",
        "gia": "2.940 VNĐ/gói"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Urinepro",
        "hoatChat": "Kim tiền thảo 1000mg, Nhân trần 250mg, Hoàng cầm 150mg, Nghệ 250mg, Binh lang 100mg, Chỉ thực 100mg, Hậu phác 100mg, Bạch mao căn 500mg, Mộc hương 100mg, Đại hoàng 50mg",
        "quyCach": "Hộp 1 lọ x 60 viên",
        "gia": "3.000 VNĐ/viên"
      },
      {
        "nhom": "Gan mật - tiết niệu",
        "ten": "Telisin",
        "hoatChat": "Terlipressin acetat 0,2mg/ml",
        "quyCach": "Hộp 5 ống x 5ml",
        "gia": "514.920 VNĐ/ống"
      },
      {
        "nhom": "Men vi sinh",
        "ten": "Finelus DC",
        "hoatChat": "Lactobacillus acidophilus 10^8 CFU, Bifidobacterium lactis 10^8 CFU, Bacillus clausii 10^8 CFU, Chất xơ Polydextrose 400 mg, Kẽm Gluconat 35 mg, Mangan Gluconat 5 mg",
        "quyCach": "Hộp x 10 lọ",
        "gia": "20.000 VNĐ/lọ"
      },
      {
        "nhom": "Dạ dày",
        "ten": "BFS-Famotidin",
        "hoatChat": "Famotidine 20mg/ml",
        "quyCach": "Hộp 10 ống x 2ml",
        "gia": "38.850 VNĐ/ống"
      },
      {
        "nhom": "Trẻ em - bổ sung",
        "ten": "Zentokid Vegelax",
        "hoatChat": "FOS (Fructo-oligosaccarid) 1000mg, Inulin 50mg, Cao khô actiso 50mg, Chiết xuất mận 50mg, Vitamin B2 1mg, Vitamin B6 1mg",
        "quyCach": "Hộp 4 vỉ x 5 ống 5ml",
        "gia": "170.000 VNĐ/hộp"
      },
      {
        "nhom": "Tai mũi họng",
        "ten": "Fosmitic",
        "hoatChat": "Fosfomycin natri 150mg/5ml",
        "quyCach": "Hộp 1 lọ x 5ml",
        "gia": "45.000 VNĐ/lọ"
      },
      {
        "nhom": "Tai mũi họng",
        "ten": "Desone 30ml",
        "hoatChat": "Desloratadin 0,5 mg/ml",
        "quyCach": "Hộp 1 lọ x 30ml",
        "gia": "45.000 VNĐ/lọ"
      },
      {
        "nhom": "Tai mũi họng",
        "ten": "VNP Spray Cu",
        "hoatChat": "NaCl, Muối Đồng, Iota carrageenan",
        "quyCach": "Hộp 1 lọ x 100ml",
        "gia": "98.000 VNĐ/lọ"
      },
      {
        "nhom": "Tai mũi họng",
        "ten": "VNP Spray Baby",
        "hoatChat": "NaCl",
        "quyCach": "Hộp 1 lọ x 50ml",
        "gia": "68.000 VNĐ/lọ"
      },
      {
        "nhom": "Tai mũi họng",
        "ten": "VNP Spray Thyme",
        "hoatChat": "NaCl, Muối Mangan, Calci, Theanin, Thyme extract",
        "quyCach": "Hộp 1 lọ x 100ml",
        "gia": "100.000 VNĐ/lọ"
      },
      {
        "nhom": "Hạ sốt - giảm đau",
        "ten": "Pamol 120",
        "hoatChat": "Paracetamol 120mg/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "3.780 VNĐ/ống"
      },
      {
        "nhom": "Hạ sốt - giảm đau",
        "ten": "Pamol 250",
        "hoatChat": "Paracetamol 250mg/5ml",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "4.500 VNĐ/ống"
      },
      {
        "nhom": "Hạ sốt - giảm đau",
        "ten": "Lexadol",
        "hoatChat": "Menthol (miếng dán hạ sốt)",
        "quyCach": "Hộp 1 gói x 5 miếng",
        "gia": "5.500 VNĐ/miếng"
      },
      {
        "nhom": "Ho - hô hấp",
        "ten": "Mucome softcap",
        "hoatChat": "Tinh dầu khuynh diệp, tinh dầu cam ngọt, tinh dầu đào kim nương, tinh dầu chanh, tinh dầu gừng, tinh dầu húng chanh, Menthol",
        "quyCach": "Hộp 6 vỉ x 15 viên nang mềm",
        "gia": "1.100 VNĐ/viên"
      },
      {
        "nhom": "Ho - hô hấp",
        "ten": "Mucome Baby Spray",
        "hoatChat": "Xylometazolin hydroclorid 0,05 %",
        "quyCach": "Hộp 1 lọ x 10ml",
        "gia": "26.500 VNĐ/lọ"
      },
      {
        "nhom": "Ho - hô hấp",
        "ten": "Vinflam spray",
        "hoatChat": "Benzydamine hydrochloride 30mg/ml",
        "quyCach": "Hộp 1 lọ x 15ml",
        "gia": "165.000 VNĐ/lọ"
      },
      {
        "nhom": "Trẻ em - bổ sung",
        "ten": "Zentokid",
        "hoatChat": "L-argininen L-aspartate, Lysin hydrochloride, Springer, Hops Flower, Valerian, Artichoke, B1, PP, B6",
        "quyCach": "Kiện 132 hộp x 10 ống",
        "gia": "18.000 VNĐ/ống"
      },
      {
        "nhom": "Trẻ em - bổ sung",
        "ten": "Zentokid ZinC",
        "hoatChat": "Vitamin C (Natri-L-ascorbat) 50 mg, Zinc gluconate (tương đương 5,06 mg Kẽm) 35,053 mg",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5 ml",
        "gia": "5.500 VNĐ/ống"
      },
      {
        "nhom": "Trẻ em - bổ sung",
        "ten": "Zentokid D3K2",
        "hoatChat": "Cholecalciferol 12.000 IU, Vitamin K2-MK7 (Menaquinone-7) 300 µg",
        "quyCach": "Hộp 1 lọ x 10ml",
        "gia": "99.000 VNĐ/lọ"
      },
      {
        "nhom": "Trẻ em - bổ sung",
        "ten": "Smartk Id",
        "hoatChat": "Beta glucan 2250 mg, Yến mạch 1500 mg, Echinacea purpurea extract 2250 mg, Kẽm gluconat 25mg, Acid ascorbic 1250 mg",
        "quyCach": "Hộp x 1 lọ x 150ml",
        "gia": "88.000 VNĐ/lọ"
      },
      {
        "nhom": "Bổ sung - vitamin",
        "ten": "Vital Pro",
        "hoatChat": "Canci, magne, vitamin C, nhân sâm, Sắt II sunlfat, vitamin E, Đồng II sulfat, Kẽm sulfat, B6, B2, B1, B12, A, Biotin, Folic acid, Natri selen",
        "quyCach": "Hộp 1 lọ x 60 viên",
        "gia": "3.300 VNĐ/viên"
      },
      {
        "nhom": "Bổ sung - vitamin",
        "ten": "Rosimet softcap",
        "hoatChat": "Cao khô actiso 100 mg, Fish oil 100mg, Coenzyme Q10 30 mg, Rutin 25 mg, Policosanol 10 mg, Vitamin B3 (Nicotinamid) 5 mg",
        "quyCach": "Hộp 1 lọ x 60 viên",
        "gia": "3.300 VNĐ/viên"
      },
      {
        "nhom": "Bổ sung - vitamin",
        "ten": "Premical softcap",
        "hoatChat": "Calci hydroxyapatid 385mg, Zinc oxid 5,6 mg, Magie oxid 125 mg, Vitamin D3 100 IU, Vitamin K2 10 mcg, Fructose oligo saccharide 50 mg, Plum juice powder 50 mg, Collagen peptides 50 mg",
        "quyCach": "Hộp 1 lọ x 60 viên",
        "gia": "3.300 VNĐ/viên"
      },
      {
        "nhom": "Bổ sung - vitamin",
        "ten": "SIX.AM",
        "hoatChat": "Rotundin sulfat, dịch chiết hoa nghệ tây",
        "quyCach": "Hộp 4 vỉ x 5 ống x 5ml",
        "gia": "14.000 VNĐ/ống"
      },
      {
        "nhom": "Gây tê ngoài da",
        "ten": "Liproin",
        "hoatChat": "Lidocain 25mg, Prilocain 25mg",
        "quyCach": "Hộp 1 tuýp x 5g",
        "gia": "36.500 VNĐ/tuýp"
      },
      {
        "nhom": "Thuốc tác dụng đối với máu",
        "ten": "Fogyma",
        "hoatChat": "Sắt (III) hydroxyd polymaltose 50mg/10ml",
        "quyCach": "Hộp 8 vỉ x 5 ống x 10ml",
        "gia": "7.500 VNĐ/ống"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel Iron",
        "hoatChat": "Lipofer Na Dispersible (tương đương 15mg Sắt) 172mg, Fructooligosaccharides 112,5mg, Natri Riboflavin 5'-Phosphat (Vitamin B2) 0,75mg, Acid folic (B9) 225mcg, Vitamin B12 1,5mcg",
        "quyCach": "Hộp 20 gói x 15g",
        "gia": "6.000 VNĐ/gói"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel Calci",
        "hoatChat": "Calci hydroxyapatite (tương đương 150 mg canxi) 376,63 mg, Fructose oligosaccharide 50 mg, Vitamin K2 MK7 (Menaquinon-7) 22,5 mcg, Vitamin D3 (Cholecalciferol) 200 IU",
        "quyCach": "Hộp 20 gói x 15g",
        "gia": "6.000 VNĐ/gói"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel befit",
        "hoatChat": "Chiết xuất Ý dĩ 300mg, Chiết xuất cơm cháy 250mg, Levocarnitin (L-carnitine) 250mg, Chiết xuất quả bứa (Garcinia cambogia) 200mg, Glucomannan 150mg, Chiết xuất mận 50mg, Chiết xuất trà xanh 50mg",
        "quyCach": "Hộp 20 gói x 15g",
        "gia": "9.000 VNĐ/gói"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel Filatos",
        "hoatChat": "Lysin Hydroclorid 200 mg (tương đương 160mg Lysin), Cao gan 180 mg",
        "quyCach": "Hộp 20 gói x 15g",
        "gia": "3.400 VNĐ/gói"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel Beauty",
        "hoatChat": "Hydroxytyrosol 20% (Chiết xuất từ oliu) 20 mg, Hydrolyzed Collagen 750 mg, Natri Hyaluronate 300 µg, Biotin 100 µg, Vitamin C (Sodium Ascorbate) 100 mg",
        "quyCach": "Hộp 20 gói x 10g",
        "gia": "10.500 VNĐ/gói"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel Bone",
        "hoatChat": "Calci hydroxyapatite (tương đương 200 mg canxi) 515 mg, Fructose oligosaccharide 50 mg, Taurin 35 mg, Vitamin B1 0,4 mg, Vitamin B6 0,4 mg, Vitamin E 0,3 mg, Vitamin K2 MK7 12,5 mcg, Vitamin D3 100 IU",
        "quyCach": "Hộp 20 gói x 15g",
        "gia": "6.000 VNĐ/gói"
      },
      {
        "nhom": "Thạch ăn liền Cjel",
        "ten": "Cjel Sleep",
        "hoatChat": "Chiết xuất củ bình vôi (Stephania Rotunda, tương đương Rotundin Sulfat 40 mg) 4000 mg, Chiết xuất việt quất (Bilberry) 100 mg, GABA 50 mg, Melatonin 2,5 mg",
        "quyCach": "Hộp 20 gói x 15g",
        "gia": "6.000 VNĐ/gói"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "Gravia Sup 500mg",
        "hoatChat": "Clotrimazol 500 mg/viên",
        "quyCach": "Hộp 1 vỉ x 1 viên đặt",
        "gia": "53.000 VNĐ/viên"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "Gravia Sup 200mg",
        "hoatChat": "Clotrimazol 200 mg/viên",
        "quyCach": "Hộp 1 vỉ x 3 viên đặt",
        "gia": "23.000 VNĐ/viên"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "Gravia Sup 100mg",
        "hoatChat": "Clotrimazol 100mg/viên",
        "quyCach": "Hộp 1 vỉ x 6 viên đặt",
        "gia": "12.000 VNĐ/viên"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "Metagin",
        "hoatChat": "Metronidazol 500mg, Neomycin 65000 IU, Nystatin 100000 IU",
        "quyCach": "Hộp 2 vỉ x 6 viên đặt",
        "gia": "8.000 VNĐ/viên"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "Vagidequa",
        "hoatChat": "Dequalinium hydrochloride 10 mg/viên",
        "quyCach": "Hộp 1 vỉ x 6 viên đặt",
        "gia": "15.000 VNĐ/hộp"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "Vagilgood",
        "hoatChat": "Lactobacillus rhamnosus, Lactobacillus paracasei, Lactobacillus plantarum",
        "quyCach": "Hộp 2 vỉ x 5 viên đặt",
        "gia": "27.000 VNĐ/viên"
      },
      {
        "nhom": "Phụ khoa - viên đặt",
        "ten": "pH. Balance",
        "hoatChat": "Acid lactic, Natri lactat",
        "quyCach": "Hộp 1 vỉ x 7 viên đặt",
        "gia": "10.000 VNĐ/viên"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Bio Intimate Gel",
        "hoatChat": "Lactobacillus Ferment Extract, Dexpanthenol, Inulin, Allantoin, Aloe vera extract, Acid lactic",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Intimate Gel",
        "hoatChat": "Nước tinh khiết, Cocamidopropyl Betaine, Glycerin, Propylen Glycol, Dexpanthenol, Acid lactic, Thyme Extract",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "98.000 VNĐ/hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Mois Intimate Gel",
        "hoatChat": "Nước tinh khiết, WH Complex (Sodium hyaluronate, Lactic Acid, Glycerin), Aloe Vera Extract, Vitamin E",
        "quyCach": "Hộp 1 lọ x 200ml",
        "gia": "98.000 VNĐ/lọ"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Baby Intimate Gel",
        "hoatChat": "Nước tinh khiết, Inulin, Aloe Vera Extract, Green Tea Extract, Chamomile Extract, Dexpanthenol, Glycerin",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Protect Intimate Gel",
        "hoatChat": "Dequalinium chloride, Witch Hazel Extract, Chamomile Extract, Thyme Extract",
        "quyCach": "Hộp 1 lọ x 200 ml",
        "gia": "139.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gel bọt pH Balance Intimate Gel for men",
        "hoatChat": "Lonicera Japonica extract (Kim ngân), Witch Hazel Extract, Aloe Vera Extract, Green Tea Extract, Chamomile Extract, Nicotinamide",
        "quyCach": "Hộp 1 lọ x 135ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Dung dịch vệ sinh",
        "ten": "Gravia intimate gel pH 8",
        "hoatChat": "Clotrimazol, Vitamin E, Chamomile Extract, Glycerin, Cocamidopropyl Betaine",
        "quyCach": "Hộp 1 lọ x 80ml",
        "gia": "98.000 VNĐ/Hộp"
      },
      {
        "nhom": "Chăm sóc khác",
        "ten": "Mucome Herb Oil",
        "hoatChat": "Menthol, tinh dầu khuynh diệp, tinh dầu bạc hà, tinh dầu đinh hương, tinh dầu oải hương, tinh dầu gừng, camphor, methyl salicylat",
        "quyCach": "Hộp 1 chai x 5ml",
        "gia": "22.000 VNĐ/chai"
      },
      {
        "nhom": "Chăm sóc khác",
        "ten": "Conadin Shampoo",
        "hoatChat": "Decyl glucoside, cocamidopropyl betain, kẽm pyrithion, cocamide diethanolamin, glycerin, dexpanthenol, kẽm gluconat, polyquaternium-10, citric acid, dimethicon",
        "quyCach": "Hộp 1 chai x 285ml",
        "gia": "96.800 VNĐ/chai"
      }
    ]
  }
];

export const NGAY_CAP_NHAT = "Tháng 9/2025";
