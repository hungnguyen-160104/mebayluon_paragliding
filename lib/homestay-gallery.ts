// lib/homestay-gallery.ts
/**
 * Bộ sưu tập ảnh Clubhouse Mebayluon, hiện ở trang /homestay.
 *
 * File này SINH RA TỪ TÊN ẢNH: chủ nhà đặt tên file chính là chú thích, script
 * chỉ đổi tên sang slug ASCII cho URL sạch và giữ nguyên chú thích tiếng Việt
 * để dùng làm caption và thuộc tính alt.
 *
 * THÊM ẢNH: thả ảnh (đặt tên = chú thích) vào media-inbox/Homestay photo/ rồi
 * chạy lại script dựng bộ sưu tập.
 *
 * Chú thích cố ý để tiếng Việt: đây là tên riêng và mô tả một địa điểm Việt
 * Nam, dịch máy sang 5 thứ tiếng sẽ sai sắc thái. Nhãn NHÓM thì có dịch.
 */

export type HomestayPhotoGroup =
  | "rooms"
  | "pool"
  | "dining"
  | "events"
  | "field"
  | "access"
  | "space";

export type HomestayPhoto = {
  src: string;
  /** Chú thích, dùng luôn làm alt. */
  caption: string;
  group: HomestayPhotoGroup;
};

export const HOMESTAY_GALLERY: HomestayPhoto[] = [
  { src: "/homestay/gallery/khach-den-checkin-phong-mebayluon-clubhouse.jpg", caption: "Khách đến checkin phòng Mebayluon Clubhouse", group: "rooms" },
  { src: "/homestay/gallery/khong-gian-phong-cong-dong-mebayluon-clubhouse-1.jpg", caption: "Không gian phòng cộng đồng Mebayluon Clubhouse", group: "rooms" },
  { src: "/homestay/gallery/mebayluon-clubhouse-dorm.jpg", caption: "Mebayluon Clubhouse dorm", group: "rooms" },
  { src: "/homestay/gallery/phong-cong-dong-lon.jpg", caption: "Phòng cộng đồng lớn", group: "rooms" },
  { src: "/homestay/gallery/phong-dorm-mebayluon-clubhouse-du-suc-chua-gan-30-nguoi.jpg", caption: "Phòng dorm Mebayluon Clubhouse đủ sức chứa gần 30 người", group: "rooms" },
  { src: "/homestay/gallery/phong-giuong-doi-trong-nha-san-mebayluon-clubhouse.jpg", caption: "Phòng giường đôi trong nhà sàn Mebayluon Clubhouse", group: "rooms" },
  { src: "/homestay/gallery/phong-giuong-doi-view-suoi-mebayluon.jpg", caption: "Phòng giường đôi view suối Mebayluon", group: "rooms" },
  { src: "/homestay/gallery/phong-giuong-don.jpg", caption: "Phòng giường đơn", group: "rooms" },
  { src: "/homestay/gallery/phong-doi-mebayluon-clubhouse.jpg", caption: "Phòng đôi Mebayluon Clubhouse", group: "rooms" },
  { src: "/homestay/gallery/be-boi-mebayluon-clubhouse.jpg", caption: "Bể bơi Mebayluon Clubhouse", group: "pool" },
  { src: "/homestay/gallery/be-boi-ven-suoi-mebayluon.jpg", caption: "Bể bơi ven suối Mebayluon", group: "pool" },
  { src: "/homestay/gallery/bua-toi-ngoai-troi-view-suoi.jpg", caption: "Bữa tối ngoài trời view suối", group: "pool" },
  { src: "/homestay/gallery/mebayluon-clubhouse-view-suoi.jpg", caption: "Mebayluon Clubhouse view suối", group: "pool" },
  { src: "/homestay/gallery/view-suoi-mebayluon-clubhouse-1.jpg", caption: "View suối Mebayluon Clubhouse", group: "pool" },
  { src: "/homestay/gallery/view-suoi-mebayluon-clubhouse.jpg", caption: "View suối Mebayluon Clubhouse", group: "pool" },
  { src: "/homestay/gallery/an-toi-ngoai-troi-mebayluon-clubhouse.jpg", caption: "Ăn tối ngoài trời Mebayluon Clubhouse", group: "dining" },
  { src: "/homestay/gallery/gala-dinner-mebayluon-clubhouse.jpg", caption: "Gala dinner Mebayluon Clubhouse", group: "dining" },
  { src: "/homestay/gallery/quay-cafe-mebayluon-clubhouse.jpg", caption: "Quầy cafe Mebayluon Clubhouse", group: "dining" },
  { src: "/homestay/gallery/hoi-nghi-tap-huan-du-luon-tai-mebayluon-clubhouse.jpg", caption: "Hội nghị tập huấn dù lượn tại Mebayluon Clubhouse", group: "events" },
  { src: "/homestay/gallery/le-hoi-du-luon-mebayluon-clubhouse.jpg", caption: "Lễ hội dù lượn Mebayluon Clubhouse", group: "events" },
  { src: "/homestay/gallery/mebayluon-clubhouse-du-suc-chua-cho-hoi-nghi-60-nguoi.jpg", caption: "Mebayluon Clubhouse đủ sức chứa cho hội nghị 60 người", group: "events" },
  { src: "/homestay/gallery/mot-su-kien-team-building-tai-mebayluon-clubhouse.jpg", caption: "Một sự kiện team building tại Mebayluon Clubhouse", group: "events" },
  { src: "/homestay/gallery/team-building-voi-du-mebayluon-clubhouse.jpg", caption: "Team building với dù Mebayluon Clubhouse", group: "events" },
  { src: "/homestay/gallery/to-chuc-hoi-nghi-du-luon-mebayluon-clubhouse.jpg", caption: "Tổ chức hội nghị dù lượn Mebayluon Clubhouse", group: "events" },
  { src: "/homestay/gallery/ba-con-dan-ban-den-xem-du.jpg", caption: "Bà con dân bản đến xem dù", group: "field" },
  { src: "/homestay/gallery/bai-ha-canh-mebayluon-clubhouse.jpg", caption: "Bãi hạ cánh Mebayluon Clubhouse", group: "field" },
  { src: "/homestay/gallery/bien-chi-dan-nga-ba-ban-lim-re-vao-bai-ha-du-luon.jpg", caption: "Biển chỉ dẫn ngã ba bản lìm rẽ vào bãi hạ dù lượn", group: "field" },
  { src: "/homestay/gallery/phi-cong-len-nui-mebayluon-clubhouse.jpg", caption: "Phi công lên núi Mebayluon Clubhouse", group: "field" },
  { src: "/homestay/gallery/san-co-mebayluon-rong-10-000m2.jpg", caption: "Sân cỏ Mebayluon rộng 10,000m2", group: "field" },
  { src: "/homestay/gallery/san-co-bai-ha-du-khau-pha.jpg", caption: "Sân cỏ bãi hạ dù Khau Phạ̣", group: "field" },
  { src: "/homestay/gallery/san-du.jpg", caption: "Sân dù", group: "field" },
  { src: "/homestay/gallery/san-ha-du-mebayluon-clubhouse.jpg", caption: "Sân hạ dù Mebayluon Clubhouse", group: "field" },
  { src: "/homestay/gallery/view-du-luon-mebayluon-clubhouse.jpg", caption: "View dù lượn Mebayluon Clubhouse", group: "field" },
  { src: "/homestay/gallery/view-san-du-tu-tang-2.jpg", caption: "View sân dù từ tầng 2", group: "field" },
  { src: "/homestay/gallery/nga-3-ban-lim-re-vao-mebayluon-clubhouse.jpg", caption: "Ngã 3 bản lìm rẽ vào Mebayluon Clubhouse", group: "access" },
  { src: "/homestay/gallery/chau-rua-mebayluon-clubhouse.jpg", caption: "Chậu rửa Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/clubhouse-mebayluon.jpg", caption: "Clubhouse Mebayluon", group: "space" },
  { src: "/homestay/gallery/mebayluon-clubhouse.jpg", caption: "Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/mebayluon-clubhouse-view.jpg", caption: "Mebayluon Clubhouse view", group: "space" },
  { src: "/homestay/gallery/morning-mebayluon-clubhouse.jpg", caption: "Morning Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/nha-ve-sinh-mebayluon-clubhouse.jpg", caption: "Nhà vệ sinh Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/sanh-truoc-mebayluon-clubhouse.jpg", caption: "Sảnh trước Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/toan-canh-mebayluon-clubhouse.jpg", caption: "Toàn cảnh Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/toan-canh-tren-cao-mebayluon-clubhouse.jpg", caption: "Toàn cảnh trên cao Mebayluon Clubhouse", group: "space" },
  { src: "/homestay/gallery/view-ra-san.jpg", caption: "View ra sân", group: "space" },
];

/** Thứ tự hiện các nhóm trên thanh lọc. */
export const HOMESTAY_GALLERY_GROUPS: HomestayPhotoGroup[] = [
  "rooms",
  "space",
  "pool",
  "dining",
  "field",
  "events",
  "access",
];

type Lang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export const HOMESTAY_GALLERY_I18N: Record<
  Lang,
  { title: string; subtitle: string; all: string } & Record<HomestayPhotoGroup, string>
> = {
  vi: {
    title: "Bộ sưu tập ảnh",
    subtitle: "Không gian, phòng nghỉ và sân bãi tại Clubhouse Mebayluon.",
    all: "Tất cả",
    rooms: "Phòng nghỉ",
    space: "Không gian chung",
    pool: "Bể bơi & suối",
    dining: "Ăn uống",
    field: "Sân bãi & dù lượn",
    events: "Hội nghị & team building",
    access: "Đường vào",
  },
  en: {
    title: "Photo gallery",
    subtitle: "Spaces, rooms and grounds at Clubhouse Mebayluon.",
    all: "All",
    rooms: "Rooms",
    space: "Common areas",
    pool: "Pool & stream",
    dining: "Food & drink",
    field: "Grounds & paragliding",
    events: "Conferences & team building",
    access: "Getting here",
  },
  fr: {
    title: "Galerie photo",
    subtitle: "Espaces, chambres et terrains du Clubhouse Mebayluon.",
    all: "Tout",
    rooms: "Chambres",
    space: "Espaces communs",
    pool: "Piscine & ruisseau",
    dining: "Restauration",
    field: "Terrains & parapente",
    events: "Séminaires & team building",
    access: "Accès",
  },
  ru: {
    title: "Фотогалерея",
    subtitle: "Пространства, номера и площадки Clubhouse Mebayluon.",
    all: "Все",
    rooms: "Номера",
    space: "Общие зоны",
    pool: "Бассейн и ручей",
    dining: "Еда и напитки",
    field: "Площадки и парапланеризм",
    events: "Конференции и тимбилдинг",
    access: "Как добраться",
  },
  zh: {
    title: "照片集",
    subtitle: "Clubhouse Mebayluon 的空间、客房与场地。",
    all: "全部",
    rooms: "客房",
    space: "公共区域",
    pool: "泳池与溪流",
    dining: "餐饮",
    field: "场地与滑翔伞",
    events: "会议与团建",
    access: "如何抵达",
  },
  hi: {
    title: "फ़ोटो गैलरी",
    subtitle: "Clubhouse Mebayluon के स्थान, कमरे और मैदान।",
    all: "सभी",
    rooms: "कमरे",
    space: "साझा क्षेत्र",
    pool: "पूल और नदी",
    dining: "खान-पान",
    field: "मैदान और पैराग्लाइडिंग",
    events: "सम्मेलन और टीम बिल्डिंग",
    access: "कैसे पहुँचें",
  },
};
