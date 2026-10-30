import type { Banner, Category, Product, ProductKind, SiteSettings } from '../types'

// Local preview data mirrors supabase/seed.sql. It is used only when Supabase is not configured.
const categoryId = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const productId = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`

const categorySeeds: Array<[ProductKind, string, string, string]> = [
  ['fashion', 'ao-nu', 'Áo nữ', 'Những chiếc áo thanh lịch cho mọi khoảnh khắc.'],
  ['fashion', 'quan-nu', 'Quần nữ', 'Phom dáng hiện đại, dễ phối mỗi ngày.'],
  ['fashion', 'vay-dam', 'Váy & đầm', 'Chuyển động mềm mại trong từng thiết kế.'],
  ['fashion', 'chan-vay', 'Chân váy', 'Nét nữ tính với tinh thần đương đại.'],
  ['fashion', 'ao-khoac', 'Áo khoác', 'Lớp hoàn thiện cho phong cách riêng.'],
  ['fashion', 'phu-kien', 'Phụ kiện', 'Điểm nhấn tinh tế cho tổng thể.'],
  ['beauty', 'son-moi', 'Son môi', 'Sắc màu tôn vẻ đẹp tự nhiên.'],
  ['beauty', 'sua-rua-mat', 'Sữa rửa mặt', 'Bắt đầu một làn da khỏe từ bước làm sạch.'],
  ['beauty', 'serum', 'Serum', 'Dưỡng chất cô đọng cho làn da rạng rỡ.'],
  ['beauty', 'kem-duong', 'Kem dưỡng', 'Nuôi dưỡng làn da mỗi ngày.'],
  ['beauty', 'kem-chong-nang', 'Kem chống nắng', 'Bảo vệ da nhẹ nhàng mỗi ngày.'],
  ['beauty', 'tay-trang', 'Tẩy trang', 'Làm sạch dịu nhẹ cuối ngày.'],
  ['beauty', 'mat-na', 'Mặt nạ', 'Một khoảng nghỉ cho làn da.'],
  ['beauty', 'cham-soc-co-the', 'Chăm sóc cơ thể', 'Chăm sóc bản thân từ những điều nhỏ.'],
]

const categoryImageIds = [
  'photo-1598554747436-c9293d6a588f', 'photo-1594633312681-425c7b97ccd1',
  'photo-1595777457583-95e059d581b8', 'photo-1583496661160-fb5886a0aaaa',
  'photo-1591047139829-d91aecb6caea', 'photo-1584917865442-de89df76afd3',
  'photo-1586495777744-4413f21062fa', 'photo-1556229010-6c3f2c9ca5f8',
  'photo-1707539160277-e39464517645', 'photo-1601049541289-9b1b7bbbfe19',
  'photo-1556228578-0d85b1a4d571', 'photo-1611930022073-b7a4ba5fcccd',
  'photo-1739981248829-ac9d4a6fecfa', 'photo-1620916566398-39f1143ab7be',
]

export const sampleCategories: Category[] = categorySeeds.map(([kind, slug, name, description], i) => ({
  id: categoryId(i + 1),
  kind,
  slug,
  name,
  description,
  image_url: image(categoryImageIds[i]),
  sort_order: i + 1,
  created_at: '2026-10-01T00:00:00.000Z',
}))

type Seed = {
  sku: string
  slug: string
  name: string
  category: string
  price: number
  original: number | null
  stock: number
  imageId: string
  description: string
  colors?: string[]
  material?: string
  fit?: string
  volume?: string
  ingredients?: string
  benefits?: string
  skinTypes?: string[]
  usage?: string
}

const fashion: Seed[] = [
  { sku: 'MS-F001', slug: 'ao-khong-tay-trang-tinh-gian', name: 'Áo không tay trắng tinh giản', category: 'ao-nu', price: 690000, original: 890000, stock: 24, imageId: 'photo-1598554747436-c9293d6a588f', description: 'Áo không tay trắng với đường cắt gọn gàng, dễ phối cùng quần jeans và chân váy.', colors: ['Trắng'], material: 'Cotton pha', fit: 'Suông nhẹ' },
  { sku: 'MS-F002', slug: 'ao-thun-vang-anh-nang', name: 'Áo thun vàng ánh nắng', category: 'ao-nu', price: 590000, original: null, stock: 18, imageId: 'photo-1524250502761-1ac6f2e30d43', description: 'Áo thun vàng ấm với chất vải mềm, tạo điểm nhấn tươi sáng cho trang phục thường ngày.', colors: ['Vàng nhạt'], material: 'Cotton mềm', fit: 'Regular' },
  { sku: 'MS-F003', slug: 'quan-jogger-hong-dat', name: 'Quần jogger hồng đất', category: 'quan-nu', price: 790000, original: 990000, stock: 21, imageId: 'photo-1594633312681-425c7b97ccd1', description: 'Quần jogger hồng đất với cạp cao và phom thoải mái cho ngày năng động.', colors: ['Hồng đất'], material: 'Cotton pha', fit: 'Jogger' },
  { sku: 'MS-F004', slug: 'quan-jeans-ong-rong', name: 'Quần jeans ống rộng', category: 'quan-nu', price: 820000, original: null, stock: 26, imageId: 'photo-1541099649105-f69ad21f3246', description: 'Denim xanh cổ điển với phom rộng thoải mái cho nhịp sống năng động.', colors: ['Xanh denim'], material: 'Denim cotton', fit: 'Wide leg' },
  { sku: 'MS-F005', slug: 'dam-da-hoi-do-ruc-ro', name: 'Đầm dạ hội đỏ rực rỡ', category: 'vay-dam', price: 1290000, original: 1590000, stock: 15, imageId: 'photo-1595777457583-95e059d581b8', description: 'Đầm đỏ dáng dài với tà váy bay nhẹ, nổi bật trong những buổi tiệc.', colors: ['Đỏ'], material: 'Satin', fit: 'Dáng dài' },
  { sku: 'MS-F006', slug: 'dam-hoa-nhi-mua-he', name: 'Đầm hoa nhí mùa hè', category: 'vay-dam', price: 980000, original: null, stock: 19, imageId: 'photo-1496747611176-843222e1e57c', description: 'Họa tiết hoa nhỏ trên nền vải thoáng mát, phù hợp những ngày nắng.', colors: ['Kem hoa'], material: 'Cotton voile', fit: 'Xòe nhẹ' },
  { sku: 'MS-F007', slug: 'chan-vay-xoe-den', name: 'Chân váy xòe đen', category: 'chan-vay', price: 690000, original: 790000, stock: 23, imageId: 'photo-1583496661160-fb5886a0aaaa', description: 'Chân váy đen phom xòe trẻ trung, dễ kết hợp cùng áo sơ mi.', colors: ['Đen'], material: 'Crepe', fit: 'Xòe ngắn' },
  { sku: 'MS-F008', slug: 'chan-vay-midi-xep-ly', name: 'Chân váy midi xếp ly', category: 'chan-vay', price: 620000, original: null, stock: 17, imageId: 'photo-1577900232427-18219b9166a0', description: 'Nếp xếp ly mềm mại và độ dài midi tạo chuyển động uyển chuyển.', colors: ['Be'], material: 'Voan lót mềm', fit: 'Midi' },
  { sku: 'MS-F009', slug: 'ao-khoac-bomber-nau', name: 'Áo khoác bomber nâu', category: 'ao-khoac', price: 1490000, original: 1790000, stock: 12, imageId: 'photo-1591047139829-d91aecb6caea', description: 'Áo bomber nâu với cổ bo tròn và phom dáng gọn gàng.', colors: ['Nâu'], material: 'Twill pha', fit: 'Relaxed' },
  { sku: 'MS-F010', slug: 'ao-khoac-trench-co-dien', name: 'Áo khoác trench cổ điển', category: 'ao-khoac', price: 1890000, original: null, stock: 9, imageId: 'photo-1539533018447-63fcce2678e3', description: 'Áo trench thắt eo với phom dáng vượt thời gian.', colors: ['Be'], material: 'Cotton gabardine', fit: 'Dài vừa' },
  { sku: 'MS-F011', slug: 'tui-xach-mini-do', name: 'Túi xách mini đỏ', category: 'phu-kien', price: 890000, original: null, stock: 14, imageId: 'photo-1584917865442-de89df76afd3', description: 'Túi xách mini màu đỏ với phom hộp sắc nét và quai cầm chắc chắn.', colors: ['Đỏ'], material: 'Da tổng hợp cao cấp', fit: 'Mini' },
  { sku: 'MS-F012', slug: 'khan-lua-hoa-tiet', name: 'Khăn lụa họa tiết', category: 'phu-kien', price: 390000, original: 490000, stock: 28, imageId: 'photo-1495603762254-9bf6109db284', description: 'Khăn lụa họa tiết vàng và đen, tạo chuyển động mềm mại khi phối cùng trang phục.', colors: ['Vàng mù tạt', 'Đen'], material: 'Lụa satin', fit: '70 × 70 cm' },
]

const beauty: Seed[] = [
  { sku: 'MS-B001', slug: 'son-li-nhung-rosewood', name: 'Son lì nhung Rosewood', category: 'son-moi', price: 420000, original: 490000, stock: 32, imageId: 'photo-1586495777744-4413f21062fa', description: 'Sắc hồng gỗ thanh lịch cùng chất son mịn nhẹ, bền màu tự nhiên.', colors: ['Rosewood'], volume: '3.5 g', ingredients: 'Sáp candelilla, dầu jojoba, vitamin E', benefits: 'Màu môi mềm mịn, hạn chế khô môi', skinTypes: ['Mọi loại da'], usage: 'Thoa trực tiếp lên môi, tán đều từ lòng môi.' },
  { sku: 'MS-B002', slug: 'son-duong-tint-peach', name: 'Son dưỡng tint Peach', category: 'son-moi', price: 360000, original: null, stock: 41, imageId: 'photo-1591360236480-4ed861025fa1', description: 'Lớp màu đào trong trẻo kết hợp dưỡng ẩm cho đôi môi căng mướt.', colors: ['Peach'], volume: '4 g', ingredients: 'Bơ hạt mỡ, dầu hạnh nhân, vitamin E', benefits: 'Dưỡng ẩm và tạo sắc môi tự nhiên', skinTypes: ['Mọi loại da'], usage: 'Dùng hằng ngày khi môi cần độ ẩm và màu nhẹ.' },
  { sku: 'MS-B003', slug: 'sua-rua-mat-diu-nhe', name: 'Sữa rửa mặt dịu nhẹ', category: 'sua-rua-mat', price: 390000, original: null, stock: 36, imageId: 'photo-1556229010-6c3f2c9ca5f8', description: 'Làm sạch bụi bẩn và dầu thừa nhưng vẫn giữ cảm giác ẩm mượt.', volume: '150 ml', ingredients: 'Glycerin, panthenol, chiết xuất yến mạch', benefits: 'Làm sạch dịu nhẹ, hỗ trợ hàng rào ẩm', skinTypes: ['Da khô', 'Da nhạy cảm', 'Da hỗn hợp'], usage: 'Lấy một lượng nhỏ, mát xa trên da ướt rồi rửa sạch.' },
  { sku: 'MS-B004', slug: 'serum-vitamin-c-rang-ro', name: 'Serum Vitamin C rạng rỡ', category: 'serum', price: 690000, original: 790000, stock: 27, imageId: 'photo-1707539160277-e39464517645', description: 'Serum giúp làn da trông tươi sáng và đều màu hơn.', volume: '30 ml', ingredients: 'Vitamin C, vitamin E, ferulic acid', benefits: 'Hỗ trợ làm sáng và cải thiện sắc da', skinTypes: ['Da thường', 'Da hỗn hợp', 'Da dầu'], usage: 'Dùng 2–3 giọt sau bước làm sạch, trước kem dưỡng.' },
  { sku: 'MS-B005', slug: 'serum-ha-cap-am', name: 'Serum HA cấp ẩm', category: 'serum', price: 590000, original: null, stock: 30, imageId: 'photo-1679394270597-e90694d70350', description: 'Kết cấu mỏng nhẹ bổ sung độ ẩm và giúp da mềm mại.', volume: '30 ml', ingredients: 'Hyaluronic acid, glycerin, panthenol', benefits: 'Cấp ẩm, làm da căng mịn', skinTypes: ['Mọi loại da'], usage: 'Thoa lên da còn hơi ẩm, sau đó dùng kem dưỡng.' },
  { sku: 'MS-B006', slug: 'kem-duong-am-balance', name: 'Kem dưỡng ẩm Balance', category: 'kem-duong', price: 620000, original: 720000, stock: 22, imageId: 'photo-1601049541289-9b1b7bbbfe19', description: 'Kem dưỡng êm nhẹ cho cảm giác cân bằng và mềm da suốt ngày dài.', volume: '50 ml', ingredients: 'Ceramide, squalane, niacinamide', benefits: 'Dưỡng ẩm và hỗ trợ hàng rào bảo vệ da', skinTypes: ['Da khô', 'Da hỗn hợp'], usage: 'Thoa lớp mỏng ở bước cuối chu trình dưỡng da.' },
  { sku: 'MS-B007', slug: 'kem-chong-nang-daily-veil', name: 'Kem chống nắng Daily Veil', category: 'kem-chong-nang', price: 480000, original: null, stock: 38, imageId: 'photo-1556228578-0d85b1a4d571', description: 'Lớp bảo vệ nhẹ tênh, dễ chịu dưới lớp trang điểm.', volume: '50 ml', ingredients: 'Bộ lọc UV, niacinamide, vitamin E', benefits: 'Bảo vệ da khỏi tia UV, giữ ẩm nhẹ', skinTypes: ['Mọi loại da'], usage: 'Thoa đủ lượng trước khi ra nắng 15 phút và thoa lại khi cần.' },
  { sku: 'MS-B008', slug: 'dau-tay-trang-pure', name: 'Dầu tẩy trang Pure', category: 'tay-trang', price: 450000, original: null, stock: 24, imageId: 'photo-1611930022073-b7a4ba5fcccd', description: 'Dầu tẩy trang mềm mượt giúp hòa tan lớp trang điểm cuối ngày.', volume: '200 ml', ingredients: 'Dầu hạt nho, dầu hướng dương, vitamin E', benefits: 'Làm sạch lớp trang điểm, hạn chế khô căng', skinTypes: ['Mọi loại da'], usage: 'Mát xa trên da khô, nhũ hóa với nước rồi rửa sạch.' },
  { sku: 'MS-B009', slug: 'mat-na-bo-xoai-duong-am', name: 'Mặt nạ bơ xoài dưỡng ẩm', category: 'mat-na', price: 390000, original: 450000, stock: 33, imageId: 'photo-1739981248829-ac9d4a6fecfa', description: 'Mặt nạ giàu dưỡng chất từ bơ xoài giúp da mềm mịn sau mỗi lần chăm sóc.', volume: '75 ml', ingredients: 'Bơ xoài, bơ hạt mỡ, chiết xuất lô hội', benefits: 'Dưỡng ẩm sâu, làm dịu da', skinTypes: ['Da khô', 'Da thường', 'Da hỗn hợp'], usage: 'Thoa lớp mỏng sau khi làm sạch, để 15 phút rồi rửa sạch.' },
  { sku: 'MS-B010', slug: 'sua-duong-the-soft-touch', name: 'Sữa dưỡng thể Soft Touch', category: 'cham-soc-co-the', price: 430000, original: null, stock: 29, imageId: 'photo-1620916566398-39f1143ab7be', description: 'Chất sữa thấm nhanh, để lại làn da mịn màng và hương thơm dịu.', volume: '250 ml', ingredients: 'Bơ hạt mỡ, glycerin, dầu hạnh nhân', benefits: 'Dưỡng ẩm da cơ thể', skinTypes: ['Mọi loại da'], usage: 'Thoa sau khi tắm hoặc bất cứ khi nào da cần dưỡng ẩm.' },
  { sku: 'MS-B011', slug: 'son-thoi-nude-glow', name: 'Son thỏi Nude Glow', category: 'son-moi', price: 390000, original: null, stock: 34, imageId: 'photo-1625093742435-6fa192b6fb10', description: 'Sắc nude hồng nhẹ nhàng và chất son mềm mượt cho đôi môi tự nhiên.', colors: ['Nude hồng'], volume: '3.5 g', ingredients: 'Sáp candelilla, dầu jojoba, vitamin E', benefits: 'Màu môi tự nhiên và mềm mịn', skinTypes: ['Mọi loại da'], usage: 'Thoa trực tiếp lên môi, có thể dặm thêm để tăng độ đậm.' },
  { sku: 'MS-B012', slug: 'kem-duong-phuc-hoi-cica', name: 'Kem dưỡng phục hồi Cica', category: 'kem-duong', price: 720000, original: 820000, stock: 20, imageId: 'photo-1671575192248-5d8e42f18a9c', description: 'Kết cấu giàu dưỡng chất giúp làm dịu và chăm sóc da nhạy cảm.', volume: '50 ml', ingredients: 'Centella asiatica, ceramide, panthenol', benefits: 'Làm dịu và hỗ trợ phục hồi da', skinTypes: ['Da nhạy cảm', 'Da khô'], usage: 'Thoa sau serum vào sáng và tối.' },
]

const createdDays = [24, 17, 20, 18, 23, 19, 16, 15, 12, 11, 8, 7, 22, 21, 14, 13, 10, 9, 6, 5, 4, 3, 2, 1]

function toProduct(seed: Seed, index: number, kind: ProductKind): Product {
  const category = sampleCategories.find((item) => item.slug === seed.category)!
  const created = new Date(Date.UTC(2026, 9, createdDays[index])).toISOString()
  return {
    id: productId(index + 1),
    slug: seed.slug,
    sku: seed.sku,
    name: seed.name,
    kind,
    category_id: category.id,
    category,
    brand: kind === 'fashion' ? 'MUSE STUDIO' : 'MUSE BEAUTY',
    price: seed.price,
    original_price: seed.original,
    stock: seed.stock,
    short_description: seed.description,
    description: seed.description,
    cover_image: image(seed.imageId),
    images: [image(seed.imageId)],
    image_records: [],
    variants: [],
    sizes: kind === 'fashion' && seed.category !== 'phu-kien' ? ['S', 'M', 'L', 'XL'] : [],
    colors: seed.colors ?? [],
    material: seed.material ?? null,
    fit: seed.fit ?? null,
    size_chart: null,
    volume: seed.volume ?? null,
    ingredients: seed.ingredients ?? null,
    benefits: seed.benefits ?? null,
    skin_types: seed.skinTypes ?? [],
    usage: seed.usage ?? null,
    status: 'published',
    is_new: createdDays[index] >= 18,
    is_featured: index % 3 === 0,
    is_sale: seed.original !== null,
    sold_count: [41, 27, 34, 19, 52, 33, 25, 17, 29, 12, 37, 21, 58, 44, 38, 54, 32, 47, 36, 29, 22, 43, 26, 31][index],
    created_at: created,
    updated_at: created,
  }
}

export const sampleProducts: Product[] = [
  ...fashion.map((seed, i) => toProduct(seed, i, 'fashion')),
  ...beauty.map((seed, i) => toProduct(seed, i + fashion.length, 'beauty')),
]

export const sampleBanners: Banner[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    title: 'Dành một phút cho chính mình.',
    subtitle: 'Khám phá những công thức chăm sóc da và sắc đẹp để mỗi ngày bắt đầu bằng sự dịu dàng.',
    eyebrow: 'MUSE / THE BEAUTY RITUAL',
    image_url: '/beauty-editorial.png',
    link_url: '/my-pham',
    link_label: 'Khám phá mỹ phẩm',
    is_active: true,
    sort_order: 1,
    created_at: '2026-10-01T00:00:00.000Z',
  },
]

export const sampleSettings: SiteSettings = {
  announcement_text: 'Vẻ đẹp của riêng bạn, theo cách của riêng bạn',
  hero_image_url: '/hero-editorial.png',
  hero_title: 'Vẻ đẹp là chính bạn.',
  hero_subtitle: 'Khám phá thời trang và làm đẹp được chọn lọc dành riêng cho phiên bản rạng rỡ nhất của bạn.',
  about_title: 'Một thương hiệu. Nhiều phiên bản bạn.',
  about_body: 'MUSE STORE tin rằng thời trang và vẻ đẹp không có một khuôn mẫu cố định. Chúng tôi chọn những món đồ có thể cùng bạn đi qua mọi khoảnh khắc.',
  promo_title: 'Dành một phút cho chính mình.',
  promo_body: 'Khám phá những công thức chăm sóc da và sắc đẹp để mỗi ngày bắt đầu bằng sự dịu dàng.',
  promo_link: '/my-pham',
}
