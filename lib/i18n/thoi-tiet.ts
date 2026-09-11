// lib/i18n/thoi-tiet.ts
/**
 * Chữ nghĩa cho phần THỜI TIẾT BAY trên website khách: trang danh sách và
 * widget trong từng trang điểm bay.
 *
 * Gộp cả sáu thứ tiếng vào một tệp thay vì sáu tệp như các phần lớn: đây chỉ
 * là khoảng ba chục nhãn ngắn, tách ra thì sửa một chữ phải mở sáu tệp và rất
 * dễ quên một ngôn ngữ — lỗi đã gặp nhiều lần ở phần khác.
 */

export type ThoiTietLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

export type ThoiTietCopy = {
  /** Nhãn menu và tiêu đề trang. */
  navLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  intro: string[];
  /**
   * BÀI KHÍ TƯỢNG cho người bay — đặt CUỐI trang (luật chủ 11/09: bảng thời
   * tiết lên trên, chữ nghĩa xuống dưới). Mỗi mục là một khái niệm người bay
   * phải hiểu mới đọc được bảng: áp suất, gió mặt đất, gió tầng trên, nghịch
   * nhiệt, thermal, mây–mưa–dông.
   */
  khiTuongTieuDe: string;
  khiTuong: Array<{ tieuDe: string; y: string[] }>;
  /** Ba mức. */
  good: string;
  fair: string;
  bad: string;
  /** Nhãn số liệu. */
  wind: string;
  gust: string;
  rain: string;
  direction: string;
  cloud: string;
  /** Nhãn hàng biểu tượng trời (nắng / mây / mưa). */
  sky: string;
  hour: string;
  /** Đơn vị gió — m/s, đơn vị phi công dùng tại bãi. */
  windUnit: string;
  /** Xác suất mưa (%) của mô hình. */
  rainChance: string;
  /** Nguy cơ dông (%). */
  storm: string;
  /** Trần mây / mù. */
  cloudBase: string;
  /** Sức nâng (thermal). */
  thermal: string;
  /** Số giờ có nắng trong khung giờ bay — nắng là thứ sinh ra thermal. */
  sunHours: string;
  /** Nhãn báo ngày có hoàng hôn đẹp — khung giờ bán được chuyến bay hoàng hôn. */
  goodSunset: string;
  /** Nhãn hàng bãi cất / bãi hạ trên airgram và khối vị trí. */
  takeoff: string;
  landing: string;
  /** Chênh cao giữa bãi cất và bãi hạ. */
  heightDiff: string;
  /** Khối "Tiềm năng thermal" — kết luận của quy tắc sáu yếu tố. */
  thermalPotential: string;
  /** Khung 3 giờ thermal MẠNH nhất — chủ 11/09: thermal gọi là "mạnh", không gọi là "khoẻ". */
  thermalWindow: string;
  /** Số giờ trong ngày dùng được để bay thermal. */
  thermalHours: string;
  /** Nhãn hàng kết luận từng giờ: bay được không. */
  canFly: string;
  /** Điểm điều kiện bay 0–100 của chuyên gia. */
  score: string;
  /** Độ ổn định không khí. */
  stability: string;
  /** Năm mức thermal. */
  thermalLevels: { khong: string; nhe: string; vua: string; manh: string; gat: string };
  today: string;
  bestWindow: string;
  noWindow: string;
  goodHours: string;
  /** Câu dưới thẻ. */
  source: string;
  updated: string;
  loading: string;
  error: string;
  retry: string;
  seeSpot: string;
  /** Nhãn hàng "mặt đất" trong airgram. */
  ground: string;
  /** Chú thích dưới biểu đồ nhiều ngày. */
  swipeDays: string;
  /** Mặt trời mọc / lặn — đổi theo mùa. */
  sunrise: string;
  sunset: string;
  /** Khối tóm tắt đánh giá ngày bay (bản không phải tiếng Việt). */
  assessment: string;
  confidence: string;
  /** "3h" — hậu tố số giờ. */
  hourShort: string;
  noRain: string;
  /** Mưa bay 0,4–0,8 mm/giờ: có hạt nhưng bay vẫn bay. */
  lightRain: string;
  strongGusts: string;
  cloudCover: string;
  /** Câu chốt ngắn theo mức. */
  verdictGood: string;
  verdictFair: string;
  verdictBad: string;
  bookNow: string;
  /** Widget trong trang điểm bay. */
  widgetTitle: string;
  widgetNote: string;
  mapToggleOpen: string;
  mapToggleClose: string;
  disclaimer: string;
};

const vi: ThoiTietCopy = {
  navLabel: "Thời tiết bay",
  pageTitle: "Thời tiết các điểm bay dù lượn",
  pageSubtitle: "Dự báo 10 ngày tới cho từng điểm bay — nắng, gió, thermal, mưa, trần mây, gió tầng trên",
  intro: [
    "Bay dù lượn phụ thuộc gần như hoàn toàn vào gió. Bảng dưới đây lấy dự báo của mô hình ECMWF (mô hình mà Windy hiển thị) cho đúng toạ độ bãi cất cánh của từng điểm bay, rồi chấm màu theo ngưỡng an toàn khi bay.",
    "Xanh là gió đẹp, vàng là bay được nhưng phải cân nhắc, đỏ là nên nghỉ. Dự báo chỉ để bạn chuẩn bị lịch trình — quyết định cuối cùng vẫn là của phi công tại bãi vào đúng buổi bay, vì thời tiết núi đổi rất nhanh.",
  ],
  khiTuongTieuDe: "Hiểu bản tin để đọc được bảng",
  khiTuong: [
    {
      tieuDe: "Áp suất — thứ báo trước sớm nhất",
      y: [
        "Áp suất mực biển không nói ngày mai nắng hay mưa, nó nói KHỐI KHÍ ĐANG ĐỔI. Áp tụt đều vài hPa trong một ngày là rãnh thấp hoặc front đang tới: gió sẽ đổi hướng, mây dày lên từ tầng cao xuống, và đối lưu buổi chiều mạnh hơn thường lệ. Áp lên là khối khí lạnh khô lấn vào, trời quang nhưng gió nền thường mạnh hơn.",
        "Ở vùng nhiệt đới, áp suất TỰ tụt 2–3 hPa từ khoảng 10h tới 16h rồi lên lại mỗi ngày — đó là nhịp thuỷ triều khí quyển, không phải dấu hiệu xấu. Vì vậy bảng này chỉ báo động khi áp tụt NHANH HƠN nhịp thường ngày, so với chính giờ ấy của hôm trước.",
      ],
    },
    {
      tieuDe: "Gió mặt đất — hướng quan trọng ngang tốc độ",
      y: [
        "Một bãi cất cánh chỉ bay được khi gió thổi VÀO sườn. Cùng 5 m/s: thổi thẳng vào sườn thì dù dựng lên đều, cất cánh nhẹ; thổi sau lưng thì dù sập, còn thổi ngang thì cất cánh lệch và dễ chạm cây. Nên bảng này tô màu mũi tên theo luật hướng riêng của từng bãi, chứ không chỉ nhìn con số.",
        "Ở địa hình đèo còn một cái bẫy nữa: gió luồn qua khe rồi tăng tốc đột ngột ngay mép bãi (hiệu ứng ống). Cùng một hướng, gió nhẹ thì êm mà gió mạnh lại thành gió xiết — vì thế luật hướng của mỗi điểm có riêng mục 'gió xiết' chỉ bật khi tốc độ đã lớn.",
      ],
    },
    {
      tieuDe: "Gió tầng trên và gió đứt",
      y: [
        "Gió ở mực 925, 850, 700 hPa (xấp xỉ 750m, 1.500m, 3.000m) quyết định chuyến bay nhiều hơn người ta tưởng. Mặt đất lặng mà mực 500m trên bãi đã 8–10 m/s thì thermal vừa lên khỏi sườn là bị xé, dù xóc và bị thổi lùi — bay bám sườn thấp thì được, leo cao là hỏng.",
        "Chênh lệch đột ngột giữa hai tầng gọi là GIÓ ĐỨT (wind shear). Nguy ở chỗ đứng dưới bãi đo gió thấy hiền, nhưng qua lớp đứt là nhiễu động ngay. Tab Airgram xếp bốn mực chồng nhau đúng để nhìn ra điều đó: gió tăng dần theo độ cao là bình thường, tăng vọt hoặc đổi hướng đột ngột mới là thứ phải tránh.",
      ],
    },
    {
      tieuDe: "Nghịch nhiệt — cái nắp vô hình",
      y: [
        "Bình thường càng lên cao càng lạnh. Nghịch nhiệt là lớp khí phía trên ẤM HƠN phía dưới, thường hình thành trong đêm quang mây. Nó hoạt động như một cái nắp: thermal bốc lên tới đó là dừng, nên trần thermal thấp, chuyến bay ngắn.",
        "Nghịch nhiệt còn giữ mù và mây thấp nằm lì trong thung lũng tới gần trưa — lý do nhiều buổi sáng đèo trắng xoá trong khi dự báo mưa bằng không. Nắng đốt đủ mạnh thì lớp nghịch nhiệt vỡ, mù tan nhanh trong vòng một tiếng; bảng này nói giờ dự kiến tan để canh lúc lên bãi cho đúng.",
      ],
    },
    {
      tieuDe: "Thermal — nhiên liệu của chuyến bay",
      y: [
        "Mặt đất hấp thụ bức xạ, hun nóng lớp khí sát đất, bọt khí nóng tách ra và bốc lên: đó là thermal. Hai con số nói về nó là CAPE (thế năng đối lưu — bao nhiêu 'nhiên liệu') và trần lớp xáo trộn (thermal lên được tới đâu). Bảng này gọi trần ấy là trần thermal.",
        "Thang ở đây chấm theo hướng ÊM: thermal vừa đủ thì chuyến dài và mượt, còn thermal gắt làm dù xóc và bãi đáp nổi gió xoáy. Phi công bay đường dài đọc ngược lại — với họ càng mạnh càng thích, nên hai bên nhìn cùng một con số mà kết luận khác nhau.",
      ],
    },
    {
      tieuDe: "Mây, mưa và dông",
      y: [
        "Trần mây tính từ chênh lệch nhiệt độ và điểm sương (khoảng 125m cho mỗi 1°C), rồi cộng thêm chênh độ cao giữa ô lưới mô hình và bãi thật. Trần mây thấp hơn bãi nghĩa là bãi nằm trong mây: không thấy sườn, không thấy bãi đáp, không bay.",
        "Mưa chia ba mức theo milimét mỗi giờ chứ không theo phần trăm — phần trăm của mô hình là 'có mưa đâu đó trong ô 25km', mùa mưa thì ngày nào cũng 90%. Nguy hiểm nhất không phải hạt mưa mà là DÔNG: trước khi mây dông tới, luồng gió đổ xuống quét qua bãi làm gió đảo chiều và mạnh gấp mấy lần chỉ trong vài phút. Vì vậy nguy cơ dông 40% đã là lý do không cất cánh.",
      ],
    },
  ],
  good: "BAY TỐT",
  fair: "CÂN NHẮC",
  bad: "KHÔNG BAY",
  wind: "Gió",
  gust: "Giật",
  rain: "Mưa",
  direction: "Hướng",
  cloud: "Mây",
  sky: "Trời",
  hour: "Giờ",
  windUnit: "m/s",
  rainChance: "Khả năng mưa",
  storm: "Dông",
  cloudBase: "Trần mây",
  thermal: "Thermal",
  sunHours: "giờ nắng",
  goodSunset: "Dự báo hoàng hôn đẹp",
  takeoff: "bãi cất",
  landing: "bãi hạ",
  heightDiff: "chênh cao",
  thermalPotential: "Tiềm năng thermal",
  thermalWindow: "mạnh nhất",
  thermalHours: "giờ có thermal",
  canFly: "Bay?",
  score: "Điểm",
  stability: "Ổn định",
  thermalLevels: { khong: "rất nhẹ", nhe: "nhẹ", vua: "vừa", manh: "mạnh", gat: "rất mạnh" },
  today: "Hôm nay",
  bestWindow: "Giờ đẹp",
  noWindow: "Không có khung giờ đẹp",
  goodHours: "giờ đẹp",
  source: "Nguồn",
  updated: "Cập nhật",
  loading: "Đang lấy dự báo…",
  error: "Chưa lấy được dự báo thời tiết",
  retry: "Thử lại",
  seeSpot: "Chi tiết điểm bay",
  ground: "mặt đất",
  swipeDays: "Vuốt ngang để xem các ngày tiếp theo · bấm ngày ở dải trên để nhảy tới · cột mưa: xanh = mưa, cam = mưa giông",
  sunrise: "Mặt trời mọc",
  sunset: "lặn",
  assessment: "Đánh giá ngày bay",
  confidence: "độ tin cậy",
  hourShort: "giờ",
  noRain: "Không mưa",
  lightRain: "Mưa bay — bay vẫn bay",
  strongGusts: "Gust mạnh",
  cloudCover: "Mây phủ",
  verdictGood: "Điều kiện bay tốt.",
  verdictFair: "Bay được nhưng hạn chế — hỏi lại phi công trước khi lên bãi.",
  verdictBad: "Hôm nay khó bay; phi công quyết tại bãi, trời ngớt vẫn có thể bay.",
  bookNow: "Đặt bay",
  widgetTitle: "Thời tiết bay 10 ngày tới",
  widgetNote: "Dự báo cho đúng toạ độ bãi cất cánh",
  mapToggleOpen: "Xem bản đồ gió Windy",
  mapToggleClose: "Ẩn bản đồ gió",
  disclaimer:
    "Dự báo mang tính tham khảo. Phi công quyết định bay hay hoãn tại bãi, ưu tiên an toàn tuyệt đối; nếu hoãn do thời tiết, bạn được đổi lịch hoặc hoàn tiền.",
};

const en: ThoiTietCopy = {
  navLabel: "Flying Weather",
  pageTitle: "Paragliding weather at our flying sites",
  pageSubtitle: "10-day forecast for every site — sun, wind, thermals, rain, cloud base, upper winds",
  intro: [
    "Paragliding depends almost entirely on the wind. The table below takes the ECMWF forecast (the model Windy shows) for the exact take-off coordinates of each site, then colours it against the safety limits used for flying.",
    "Green means good wind, amber means flyable but think twice, red means stay on the ground. Use it to plan your trip — the final call always belongs to the pilot at the take-off on the day, because mountain weather changes fast.",
  ],
  khiTuongTieuDe: "How to read the forecast",
  khiTuong: [
    {
      tieuDe: "Pressure — the earliest warning",
      y: [
        "Sea-level pressure does not tell you tomorrow's sunshine; it tells you the AIR MASS IS CHANGING. A steady fall of a few hPa over a day means a trough or front is arriving: wind will back or veer, high cloud thickens first, and afternoon convection runs stronger than usual. A rise means drier, cooler air moving in — clear skies, but usually a stronger gradient wind.",
        "In the tropics pressure falls 2–3 hPa by itself between about 10:00 and 16:00 and recovers overnight. That is the atmospheric tide, not a warning. This forecast therefore flags a drop only when it is FASTER than that daily rhythm, compared against the same hours the day before.",
      ],
    },
    {
      tieuDe: "Surface wind — direction matters as much as speed",
      y: [
        "A launch works only when the wind blows INTO the slope. At the same 5 m/s, straight onto the face inflates the wing evenly and the launch is easy; from behind the wing collapses, and across the face you launch crooked and drift into trees. That is why the arrows here are coloured by each site's own direction rules, not by the number alone.",
        "Mountain passes add a trap: wind funnels through a gap and accelerates right at the launch edge. The same direction is smooth when light and vicious when strong, so each site has a separate 'venturi' rule that only triggers once the speed is up.",
      ],
    },
    {
      tieuDe: "Upper winds and shear",
      y: [
        "Wind at 925, 850 and 700 hPa (roughly 750 m, 1,500 m and 3,000 m) decides more of the flight than most people expect. Calm on the ground with 8–10 m/s at 500 m above launch means thermals are torn apart as soon as they leave the slope: the wing gets rough and you drift backwards. Soaring low on the face is fine; climbing is not.",
        "A sudden jump between layers is WIND SHEAR. The danger is that the anemometer on launch reads gentle while the air just above is not. The Airgram tab stacks four levels for exactly this: wind increasing gradually with height is normal, a sudden jump or a sharp change of direction is what you avoid.",
      ],
    },
    {
      tieuDe: "Inversion — the invisible lid",
      y: [
        "Air normally cools with height. An inversion is a layer that is WARMER above than below, usually formed overnight under clear skies. It acts as a lid: a rising thermal bubble stops there, so the climb ceiling is low and flights are short.",
        "An inversion also traps fog and low cloud in the valley until late morning — the reason a pass can be white over while the rain forecast reads zero. Once the sun burns through, the lid breaks and the fog clears within an hour; this page gives the expected clearing time so you can plan when to head up.",
      ],
    },
    {
      tieuDe: "Thermals — the fuel of the flight",
      y: [
        "The ground absorbs radiation, heats the air against it, and bubbles of warm air break away and rise: that is a thermal. Two numbers describe it — CAPE (how much convective fuel there is) and the mixing-layer top (how high a bubble can get). This page calls that top the thermal ceiling.",
        "The scale here rates towards SMOOTH: moderate thermals mean a long, comfortable flight, while rough ones make the wing buck and the landing field gusty. Cross-country pilots read it the other way round — they want it strong, so the same number means opposite things to the two of you.",
      ],
    },
    {
      tieuDe: "Cloud, rain and thunderstorms",
      y: [
        "Cloud base comes from the spread between temperature and dew point (about 125 m per 1 °C), plus the height difference between the model's grid cell and the real launch. A base below launch height means the launch is inside cloud: no slope, no landing field, no flying.",
        "Rain is graded in millimetres per hour, not per cent — the model's per cent means 'rain somewhere in a 25 km cell', which reads 90% every day of the wet season. The real danger is not the raindrops but the THUNDERSTORM: before the cloud arrives its downdraught sweeps the launch, reversing the wind and multiplying its speed within minutes. A 40% storm risk is already reason enough not to take off.",
      ],
    },
  ],
  good: "GOOD TO FLY",
  fair: "MARGINAL",
  bad: "NO FLYING",
  wind: "Wind",
  gust: "Gusts",
  rain: "Rain",
  direction: "Direction",
  cloud: "Cloud",
  sky: "Sky",
  hour: "Hour",
  windUnit: "m/s",
  rainChance: "Rain chance",
  storm: "Storm",
  cloudBase: "Cloud base",
  thermal: "Thermals",
  sunHours: "sunshine hours",
  goodSunset: "Great sunset expected",
  takeoff: "take-off",
  landing: "landing",
  heightDiff: "height difference",
  thermalPotential: "Thermal potential",
  thermalWindow: "peak",
  thermalHours: "thermal hours",
  canFly: "Fly?",
  score: "Score",
  stability: "Stability",
  thermalLevels: { khong: "very light", nhe: "light", vua: "moderate", manh: "strong", gat: "very strong" },
  today: "Today",
  bestWindow: "Best window",
  noWindow: "No good window",
  goodHours: "good hours",
  source: "Source",
  updated: "Updated",
  loading: "Loading forecast…",
  error: "Could not load the weather forecast",
  retry: "Try again",
  seeSpot: "Site details",
  ground: "ground",
  swipeDays: "Swipe sideways for the next days · tap a day above to jump there · rain bars: blue = rain, orange = thundery showers",
  sunrise: "Sunrise",
  sunset: "sunset",
  assessment: "Flying-day assessment",
  confidence: "confidence",
  hourShort: "h",
  noRain: "No rain",
  lightRain: "Light drizzle — still flyable",
  strongGusts: "Strong gusts",
  cloudCover: "Cloud cover",
  verdictGood: "Good flying conditions.",
  verdictFair: "Flyable but limited — check with the pilot before heading up.",
  verdictBad: "A hard day to fly; the pilot decides at launch, and a break in the weather can still open a window.",
  bookNow: "Book a flight",
  widgetTitle: "Flying weather, next 10 days",
  widgetNote: "Forecast for the exact take-off coordinates",
  mapToggleOpen: "Open Windy wind map",
  mapToggleClose: "Hide wind map",
  disclaimer:
    "Forecasts are indicative. The pilot decides on site whether to fly, with safety first; if a flight is postponed for weather you may reschedule or get a refund.",
};

const fr: ThoiTietCopy = {
  navLabel: "Météo de vol",
  pageTitle: "Météo des sites de parapente",
  pageSubtitle: "Prévisions à 10 jours pour chaque site — soleil, vent, thermiques, pluie, base des nuages, vent d\u2019altitude",
  intro: [
    "Le parapente dépend presque entièrement du vent. Le tableau ci-dessous reprend les prévisions ECMWF (le modèle affiché par Windy) aux coordonnées exactes du décollage de chaque site, puis les colore selon les limites de sécurité du vol.",
    "Vert : vent favorable. Orange : volable mais à réfléchir. Rouge : rester au sol. Servez-vous-en pour organiser votre voyage — la décision finale revient toujours au pilote sur le site le jour même, car la météo de montagne change vite.",
  ],
  khiTuongTieuDe: "Comprendre le bulletin",
  khiTuong: [
    {
      tieuDe: "Pression — le signal le plus précoce",
      y: [
        "La pression au niveau de la mer n'annonce pas le soleil de demain : elle dit que LA MASSE D'AIR CHANGE. Une baisse régulière de quelques hPa en une journée signale un thalweg ou un front : le vent tournera, les cirrus s'épaissiront, et la convection de l'après-midi sera plus vive. Une hausse annonce de l'air plus sec et frais — ciel clair, mais vent synoptique souvent plus fort.",
        "Sous les tropiques, la pression baisse d'elle-même de 2 à 3 hPa entre 10h et 16h, puis remonte la nuit : c'est la marée atmosphérique, pas un avertissement. Ce bulletin ne signale donc une chute que si elle est PLUS RAPIDE que ce rythme quotidien, comparée aux mêmes heures la veille.",
      ],
    },
    {
      tieuDe: "Vent au sol — la direction compte autant que la vitesse",
      y: [
        "Un déco ne fonctionne que si le vent entre DANS la pente. À 5 m/s : de face, l'aile monte droit et le décollage est simple ; de dos, l'aile s'affaisse ; de travers, on part en biais vers les arbres. Les flèches sont donc colorées selon les règles de direction propres à chaque site, pas seulement selon le chiffre.",
        "En montagne s'ajoute un piège : le vent s'engouffre dans un col et accélère juste au bord du déco. La même direction est douce quand il est faible et brutale quand il forcit ; chaque site a donc une règle « venturi » qui ne se déclenche qu'au-delà d'une certaine vitesse.",
      ],
    },
    {
      tieuDe: "Vent d'altitude et cisaillement",
      y: [
        "Le vent à 925, 850 et 700 hPa (environ 750 m, 1 500 m et 3 000 m) pèse plus qu'on ne croit. Calme au sol mais 8–10 m/s à 500 m au-dessus du déco : les thermiques sont déchiquetés dès qu'ils quittent la pente, l'aile devient turbulente et l'on dérive en arrière. Voler bas en soaring reste possible, monter non.",
        "Un saut brutal entre deux couches est un CISAILLEMENT. Le piège : l'anémomètre du déco reste sage alors que l'air juste au-dessus ne l'est pas. L'onglet Airgram empile quatre niveaux pour cela : une augmentation progressive est normale, un saut ou un virage net de direction est à éviter.",
      ],
    },
    {
      tieuDe: "Inversion — le couvercle invisible",
      y: [
        "L'air se refroidit normalement avec l'altitude. Une inversion est une couche PLUS CHAUDE en haut qu'en bas, formée la nuit sous ciel clair. Elle agit comme un couvercle : la bulle thermique s'y arrête, le plafond est bas et les vols sont courts.",
        "Elle retient aussi la brume et les stratus dans la vallée jusqu'en fin de matinée — d'où ces cols blancs alors que la pluie prévue est nulle. Quand le soleil perce, le couvercle cède et la brume se dissipe en une heure ; cette page indique l'heure prévue de dissipation.",
      ],
    },
    {
      tieuDe: "Thermiques — le carburant du vol",
      y: [
        "Le sol absorbe le rayonnement, chauffe l'air au contact, et des bulles chaudes se détachent et montent : voilà le thermique. Deux chiffres le décrivent — la CAPE (le carburant disponible) et le sommet de la couche de mélange (jusqu'où la bulle monte), appelé ici plafond thermique.",
        "L'échelle privilégie la DOUCEUR : des thermiques modérés donnent un vol long et confortable, tandis que des thermiques hachés secouent l'aile et rendent l'atterrissage rafaleux. Un pilote de distance la lit à l'envers — lui les veut forts.",
      ],
    },
    {
      tieuDe: "Nuages, pluie et orages",
      y: [
        "La base des nuages se déduit de l'écart température/point de rosée (environ 125 m par 1 °C), auquel on ajoute la différence d'altitude entre la maille du modèle et le déco réel. Une base sous le déco signifie déco dans le nuage : ni pente, ni terrain, pas de vol.",
        "La pluie est classée en millimètres par heure, pas en pourcentage — le pourcentage du modèle signifie « pluie quelque part dans une maille de 25 km », soit 90 % chaque jour en saison humide. Le vrai danger n'est pas la goutte mais l'ORAGE : avant l'arrivée du nuage, sa rafale descendante balaie le déco, inverse le vent et en multiplie la vitesse en quelques minutes. Un risque de 40 % suffit à renoncer.",
      ],
    },
  ],
  good: "BON POUR VOLER",
  fair: "À ÉVALUER",
  bad: "VOL DÉCONSEILLÉ",
  wind: "Vent",
  gust: "Rafales",
  rain: "Pluie",
  direction: "Direction",
  cloud: "Nuages",
  sky: "Ciel",
  hour: "Heure",
  windUnit: "m/s",
  rainChance: "Risque de pluie",
  storm: "Orage",
  cloudBase: "Base des nuages",
  thermal: "Thermiques",
  sunHours: "heures de soleil",
  goodSunset: "Beau coucher de soleil prévu",
  takeoff: "décollage",
  landing: "atterrissage",
  heightDiff: "dénivelé",
  thermalPotential: "Potentiel thermique",
  thermalWindow: "pic",
  thermalHours: "heures de thermiques",
  canFly: "Volable ?",
  score: "Score",
  stability: "Stabilité",
  thermalLevels: { khong: "très faibles", nhe: "faibles", vua: "modérés", manh: "forts", gat: "très forts" },
  today: "Aujourd’hui",
  bestWindow: "Meilleur créneau",
  noWindow: "Aucun bon créneau",
  goodHours: "heures favorables",
  source: "Source",
  updated: "Mis à jour",
  loading: "Chargement des prévisions…",
  error: "Impossible de charger les prévisions",
  retry: "Réessayer",
  seeSpot: "Détails du site",
  ground: "sol",
  swipeDays: "Faites glisser pour voir les jours suivants · touchez un jour ci-dessus · barres de pluie : bleu = pluie, orange = averses orageuses",
  sunrise: "Lever du soleil",
  sunset: "coucher",
  assessment: "Évaluation de la journée de vol",
  confidence: "fiabilité",
  hourShort: "h",
  noRain: "Pas de pluie",
  lightRain: "Bruine légère — vol possible",
  strongGusts: "Rafales fortes",
  cloudCover: "Couverture nuageuse",
  verdictGood: "Bonnes conditions de vol.",
  verdictFair: "Volable mais limité — demandez au pilote avant de monter.",
  verdictBad: "Journée difficile ; le pilote décide au décollage, une accalmie peut ouvrir un créneau.",
  bookNow: "Réserver un vol",
  widgetTitle: "Météo de vol, 10 prochains jours",
  widgetNote: "Prévisions aux coordonnées exactes du décollage",
  mapToggleOpen: "Ouvrir la carte des vents Windy",
  mapToggleClose: "Masquer la carte des vents",
  disclaimer:
    "Prévisions données à titre indicatif. Le pilote décide sur place, la sécurité avant tout ; en cas de report pour météo, vous pouvez reprogrammer ou être remboursé.",
};

const ru: ThoiTietCopy = {
  navLabel: "Погода для полётов",
  pageTitle: "Погода на наших площадках для парапланеризма",
  pageSubtitle: "Прогноз на 10 дней для каждой площадки — солнце, ветер, термики, дождь, нижняя кромка облаков, ветер на высоте",
  intro: [
    "Полёт на параплане почти полностью зависит от ветра. В таблице ниже — прогноз ECMWF (модель, которую показывает Windy) для точных координат старта каждой площадки, раскрашенный по пределам безопасности полёта.",
    "Зелёный — хороший ветер, жёлтый — летать можно, но стоит подумать, красный — лучше остаться на земле. Используйте для планирования поездки: окончательное решение всегда за пилотом на старте в этот день, погода в горах меняется быстро.",
  ],
  khiTuongTieuDe: "Как читать прогноз",
  khiTuong: [
    {
      tieuDe: "Давление — самый ранний сигнал",
      y: [
        "Давление на уровне моря говорит не о завтрашнем солнце, а о СМЕНЕ ВОЗДУШНОЙ МАССЫ. Ровное падение на несколько гПа за сутки означает подход ложбины или фронта: ветер сменит направление, сначала уплотнится высокая облачность, а дневная конвекция будет сильнее обычного. Рост давления — приход сухого прохладного воздуха: ясно, но фоновый ветер обычно крепче.",
        "В тропиках давление само падает на 2–3 гПа с 10 до 16 часов и восстанавливается ночью: это атмосферный прилив, а не тревога. Поэтому здесь падение отмечается только тогда, когда оно БЫСТРЕЕ обычного суточного хода — в сравнении с теми же часами накануне.",
      ],
    },
    {
      tieuDe: "Приземный ветер — направление важно не меньше скорости",
      y: [
        "Старт работает, только когда ветер дует В склон. При тех же 5 м/с: точно в лицо — крыло встаёт ровно и старт лёгкий; в спину — крыло складывается; вбок — уходишь косо в сторону деревьев. Поэтому стрелки раскрашены по правилам направления каждой площадки, а не по одной лишь цифре.",
        "В горах есть ещё ловушка: ветер сжимается в седловине и резко ускоряется прямо у кромки старта. То же направление при слабом ветре спокойно, при сильном — опасно, поэтому у каждой площадки отдельное правило «трубы», срабатывающее лишь на больших скоростях.",
      ],
    },
    {
      tieuDe: "Ветер на высоте и сдвиг",
      y: [
        "Ветер на 925, 850 и 700 гПа (примерно 750, 1500 и 3000 м) решает больше, чем принято думать. Штиль внизу и 8–10 м/с на 500 м над стартом — термики рвёт сразу, как они отходят от склона: крыло трясёт, вас сносит назад. Ходить вдоль склона можно, набирать — нет.",
        "Резкий скачок между слоями — это СДВИГ ВЕТРА. Опасность в том, что на старте прибор показывает спокойствие, а чуть выше уже нет. Вкладка Airgram складывает четыре уровня именно ради этого: плавный рост с высотой нормален, скачок или резкая смена направления — то, чего избегают.",
      ],
    },
    {
      tieuDe: "Инверсия — невидимая крышка",
      y: [
        "Обычно воздух с высотой холодеет. Инверсия — слой, где сверху ТЕПЛЕЕ, чем снизу; чаще всего образуется ночью при ясном небе. Она работает как крышка: термический пузырь упирается в неё, потолок низкий, полёты короткие.",
        "Инверсия также удерживает туман и низкую облачность в долине до позднего утра — отсюда белое ущелье при нулевом прогнозе осадков. Когда солнце прогреет склоны, крышка ломается и туман расходится за час; на этой странице указано ожидаемое время прояснения.",
      ],
    },
    {
      tieuDe: "Термики — топливо полёта",
      y: [
        "Земля поглощает радиацию, греет прилегающий воздух, тёплые пузыри отрываются и всплывают — это термик. Его описывают два числа: CAPE (сколько «топлива» для конвекции) и верх слоя перемешивания (докуда дойдёт пузырь). Здесь он назван потолком термиков.",
        "Шкала здесь оценивает в сторону МЯГКОСТИ: умеренные термики дают долгий и спокойный полёт, резкие — трясут крыло и делают посадку порывистой. Пилот-маршрутник читает её наоборот — ему нужны сильные.",
      ],
    },
    {
      tieuDe: "Облака, дождь и гроза",
      y: [
        "Нижняя кромка облаков считается по разнице температуры и точки росы (около 125 м на 1 °C) плюс разница высот между ячейкой модели и реальным стартом. Кромка ниже старта означает старт в облаке: не видно ни склона, ни площадки приземления — не летаем.",
        "Дождь оценивается в миллиметрах в час, а не в процентах: процент модели означает «дождь где-то в ячейке 25 км» и в сезон дождей каждый день равен 90%. Опаснее капель ГРОЗА: перед приходом облака нисходящий поток проходит по старту, разворачивает ветер и усиливает его в разы за считаные минуты. Риск грозы 40% — уже причина не взлетать.",
      ],
    },
  ],
  good: "ХОРОШО ДЛЯ ПОЛЁТА",
  fair: "НА ГРАНИ",
  bad: "ПОЛЁТЫ ЗАКРЫТЫ",
  wind: "Ветер",
  gust: "Порывы",
  rain: "Дождь",
  direction: "Направление",
  cloud: "Облачность",
  sky: "Небо",
  hour: "Час",
  windUnit: "м/с",
  rainChance: "Вероятность дождя",
  storm: "Гроза",
  cloudBase: "Нижняя кромка облаков",
  thermal: "Термики",
  sunHours: "часов солнца",
  goodSunset: "Ожидается красивый закат",
  takeoff: "старт",
  landing: "посадка",
  heightDiff: "перепад высот",
  thermalPotential: "Термический потенциал",
  thermalWindow: "пик",
  thermalHours: "часов с термиками",
  canFly: "Летим?",
  score: "Оценка",
  stability: "Устойчивость",
  thermalLevels: { khong: "очень слабые", nhe: "слабые", vua: "умеренные", manh: "сильные", gat: "очень сильные" },
  today: "Сегодня",
  bestWindow: "Лучшее время",
  noWindow: "Нет подходящего окна",
  goodHours: "хороших часов",
  source: "Источник",
  updated: "Обновлено",
  loading: "Загрузка прогноза…",
  error: "Не удалось загрузить прогноз погоды",
  retry: "Повторить",
  seeSpot: "Подробнее о площадке",
  ground: "земля",
  swipeDays: "Проведите вбок, чтобы увидеть следующие дни · нажмите день выше · столбики осадков: синий — дождь, оранжевый — ливни с грозой",
  sunrise: "Восход",
  sunset: "закат",
  assessment: "Оценка лётного дня",
  confidence: "достоверность",
  hourShort: "ч",
  noRain: "Без дождя",
  lightRain: "Морось — летать можно",
  strongGusts: "Сильные порывы",
  cloudCover: "Облачность",
  verdictGood: "Хорошие условия для полёта.",
  verdictFair: "Летать можно, но с ограничениями — уточните у пилота.",
  verdictBad: "Сложный день; решение принимает пилот на старте, при прояснении окно возможно.",
  bookNow: "Забронировать полёт",
  widgetTitle: "Погода для полётов, ближайшие 10 дней",
  widgetNote: "Прогноз для точных координат старта",
  mapToggleOpen: "Открыть карту ветра Windy",
  mapToggleClose: "Скрыть карту ветра",
  disclaimer:
    "Прогноз носит справочный характер. Решение принимает пилот на месте, безопасность превыше всего; при переносе из-за погоды возможен перенос даты или возврат денег.",
};

const zh: ThoiTietCopy = {
  navLabel: "飞行天气",
  pageTitle: "各滑翔伞飞行点天气",
  pageSubtitle: "各飞行点未来 10 天预报 — 日照、风、热气流、降雨、云底、高空风",
  intro: [
    "滑翔伞几乎完全取决于风。下表采用 ECMWF 模式（Windy 所显示的模式）针对各飞行点起飞场的精确坐标进行预报，并按飞行安全标准标色。",
    "绿色代表风况良好，黄色表示可飞但需谨慎，红色则建议停飞。此表供您安排行程参考——最终是否起飞，仍由当天在起飞场的飞行员决定，因为山区天气变化很快。",
  ],
  khiTuongTieuDe: "看懂这份预报",
  khiTuong: [
    {
      tieuDe: "气压——最早的预警",
      y: [
        "海平面气压不告诉你明天是否放晴，而是告诉你气团正在更替。一天内稳定下降几百帕，说明低压槽或锋面正在靠近：风向会改变、高云先增厚、午后对流比平时更旺。气压上升则是干冷空气进入——天晴，但背景风通常更强。",
        "热带地区的气压本来就会在上午十点到下午四点之间自行下降 2–3 百帕，夜里回升，这是大气潮汐，不是警报。因此本页只有在气压下降快于这一日常节奏时才提示，并与前一天同一时段对比。",
      ],
    },
    {
      tieuDe: "地面风——风向和风速同样重要",
      y: [
        "只有风吹进山坡，起飞场才可用。同样是 5 m/s：正吹上坡，伞衣起得端正、起飞轻松；背风则伞衣塌陷；侧风则起飞歪斜、容易飘向树林。因此本页的箭头按各飞行点自己的风向规则上色，而不只看数字。",
        "山口还有一个陷阱：气流挤过垭口，在起飞场边缘骤然加速。同一风向，风小时柔和，风大时凶险，所以每个点都有单独的「狭管」规则，只在风速够大时才触发。",
      ],
    },
    {
      tieuDe: "高空风与风切变",
      y: [
        "925、850、700 百帕（约 750 米、1500 米、3000 米）的风，对飞行的影响远超多数人预期。地面无风而起飞场上方 500 米已有 8–10 m/s，热气流一离开山坡就被撕碎：伞衣颠簸、人被吹退。贴坡低飞尚可，爬升则不行。",
        "两层之间的骤变叫风切变。危险在于起飞场的风速表看起来温和，而上方的空气并不温和。Airgram 页把四个高度叠在一起正是为此：风随高度平缓增大属正常，骤增或风向急转才是要回避的。",
      ],
    },
    {
      tieuDe: "逆温——看不见的盖子",
      y: [
        "正常情况下越高越冷。逆温是上方比下方更暖的一层，多在晴朗的夜间形成。它像一个盖子：上升的热气泡到此为止，所以热气流顶低、飞行时间短。",
        "逆温还会把雾和低云锁在谷中直到接近中午——这就是降雨预报为零、山口却一片白茫茫的原因。太阳晒透之后盖子破开，雾一小时内散去；本页会给出预计消散时间，方便安排客人到场时间。",
      ],
    },
    {
      tieuDe: "热气流——飞行的燃料",
      y: [
        "地面吸收辐射、加热贴地空气，暖气泡脱离上升，这就是热气流。描述它的两个数字是 CAPE（对流「燃料」有多少）和混合层顶（气泡能升到哪里），本页称后者为热气流顶。",
        "这里的评分偏向柔和：适中的热气流带来平稳而持久的飞行，强烈的热气流则让伞衣颠簸、降落场起旋风。越野飞行员的读法相反——他们要的是强。",
      ],
    },
    {
      tieuDe: "云、雨与雷暴",
      y: [
        "云底由气温与露点之差推算（每 1 °C 约 125 米），再加上模式网格高度与真实起飞场的高差。云底低于起飞场，就意味着起飞场在云里：看不见山坡、看不见降落场，不飞。",
        "降雨按每小时毫米数分级，而不用百分比——模式的百分比意思是「25 公里网格内某处有雨」，雨季每天都是 90%。真正危险的不是雨滴而是雷暴：雷暴云到达之前，其下沉气流先扫过起飞场，几分钟内使风向逆转、风速倍增。雷暴概率 40% 就已经是不起飞的理由。",
      ],
    },
  ],
  good: "适合飞行",
  fair: "需谨慎",
  bad: "不宜飞行",
  wind: "风速",
  gust: "阵风",
  rain: "降雨",
  direction: "风向",
  cloud: "云量",
  sky: "天气",
  hour: "时间",
  windUnit: "米/秒",
  rainChance: "降雨概率",
  storm: "雷暴",
  cloudBase: "云底高度",
  thermal: "热气流",
  sunHours: "日照小时",
  goodSunset: "预计日落很美",
  takeoff: "起飞场",
  landing: "降落场",
  heightDiff: "高差",
  thermalPotential: "热气流潜力",
  thermalWindow: "最强",
  thermalHours: "小时有热气流",
  canFly: "可飞?",
  score: "评分",
  stability: "稳定度",
  thermalLevels: { khong: "很弱", nhe: "弱", vua: "中等", manh: "强", gat: "很强" },
  today: "今天",
  bestWindow: "最佳时段",
  noWindow: "无合适时段",
  goodHours: "小时适飞",
  source: "数据来源",
  updated: "更新于",
  loading: "正在获取预报…",
  error: "无法获取天气预报",
  retry: "重试",
  seeSpot: "飞行点详情",
  ground: "地面",
  swipeDays: "横向滑动查看后续几天 · 点击上方日期可跳转 · 降雨柱：蓝色为降雨，橙色为雷阵雨",
  sunrise: "日出",
  sunset: "日落",
  assessment: "当日飞行评估",
  confidence: "可信度",
  hourShort: "小时",
  noRain: "无雨",
  lightRain: "毛毛雨 — 仍可飞行",
  strongGusts: "强阵风",
  cloudCover: "云量",
  verdictGood: "飞行条件良好。",
  verdictFair: "可飞但受限 — 上山前请先问飞行员。",
  verdictBad: "今天较难飞；由飞行员在起飞场决定，天气转好仍有机会。",
  bookNow: "预订飞行",
  widgetTitle: "未来 10 天飞行天气",
  widgetNote: "针对起飞场精确坐标的预报",
  mapToggleOpen: "查看 Windy 风场图",
  mapToggleClose: "隐藏风场图",
  disclaimer: "预报仅供参考。是否飞行由飞行员在现场决定，安全第一；若因天气延期，可改期或退款。",
};

const hi: ThoiTietCopy = {
  navLabel: "उड़ान का मौसम",
  pageTitle: "हमारे पैराग्लाइडिंग स्थलों का मौसम",
  pageSubtitle: "हर स्थल के लिए 10 दिन का पूर्वानुमान — धूप, हवा, थर्मल, वर्षा, बादल आधार, ऊपरी हवाएँ",
  intro: [
    "पैराग्लाइडिंग लगभग पूरी तरह हवा पर निर्भर है। नीचे दी गई तालिका हर स्थल के टेक-ऑफ़ की सटीक स्थिति के लिए ECMWF पूर्वानुमान (वही मॉडल जो Windy दिखाता है) लेती है, और उसे उड़ान की सुरक्षा सीमाओं के अनुसार रंग देती है।",
    "हरा मतलब अच्छी हवा, पीला मतलब उड़ान संभव पर सोच-समझकर, लाल मतलब ज़मीन पर ही रहें। इसे यात्रा की योजना के लिए इस्तेमाल करें — अंतिम निर्णय हमेशा उस दिन टेक-ऑफ़ पर मौजूद पायलट का होता है, क्योंकि पहाड़ी मौसम तेज़ी से बदलता है।",
  ],
  khiTuongTieuDe: "पूर्वानुमान पढ़ना कैसे",
  khiTuong: [
    {
      tieuDe: "दाब — सबसे पहली चेतावनी",
      y: [
        "समुद्र-तल दाब कल की धूप नहीं बताता, वह बताता है कि वायुराशि बदल रही है। एक दिन में कुछ hPa की लगातार गिरावट का अर्थ है द्रोणी या वाताग्र आ रहा है: हवा दिशा बदलेगी, पहले ऊँचे बादल घने होंगे, और दोपहर की संवहन सामान्य से तेज़ रहेगी। दाब बढ़ना सूखी ठंडी हवा का आना है — आसमान साफ़, पर पृष्ठभूमि हवा प्रायः तेज़।",
        "उष्ण कटिबंध में दाब स्वयं ही सुबह दस से शाम चार बजे के बीच 2–3 hPa गिरता है और रात में लौट आता है — यह वायुमंडलीय ज्वार है, चेतावनी नहीं। इसलिए यहाँ गिरावट तभी दिखाई जाती है जब वह इस दैनिक लय से तेज़ हो, पिछले दिन के उन्हीं घंटों से तुलना करके।",
      ],
    },
    {
      tieuDe: "सतही हवा — दिशा उतनी ही अहम जितनी गति",
      y: [
        "उड़ान-स्थल तभी काम करता है जब हवा ढलान में आए। वही 5 m/s: सामने से आने पर विंग सीधा उठता है और टेक-ऑफ़ आसान; पीछे से आने पर विंग बैठ जाता है; बगल से आने पर टेढ़ा निकलकर पेड़ों की ओर बहाव होता है। इसलिए यहाँ तीर हर स्थल के अपने दिशा-नियमों से रंगे जाते हैं, केवल संख्या से नहीं।",
        "पहाड़ी दर्रों में एक और जाल है: हवा दर्रे से निचुड़कर ठीक टेक-ऑफ़ किनारे पर अचानक तेज़ हो जाती है। वही दिशा धीमी हवा में शांत और तेज़ हवा में ख़तरनाक होती है, इसलिए हर स्थल का अलग 'वेंचुरी' नियम है जो गति बढ़ने पर ही लागू होता है।",
      ],
    },
    {
      tieuDe: "ऊपरी हवाएँ और विंड शियर",
      y: [
        "925, 850 और 700 hPa (लगभग 750 मी, 1,500 मी, 3,000 मी) की हवा उड़ान पर अपेक्षा से अधिक असर डालती है। ज़मीन शांत और टेक-ऑफ़ से 500 मी ऊपर 8–10 m/s का अर्थ है कि थर्मल ढलान छोड़ते ही टूट जाते हैं: विंग झटके खाता है और पीछे बहाव होता है। ढलान के पास नीचे उड़ना ठीक है, ऊपर चढ़ना नहीं।",
        "दो परतों के बीच अचानक अंतर को विंड शियर कहते हैं। ख़तरा यह है कि टेक-ऑफ़ पर हवा शांत दिखती है जबकि ठीक ऊपर नहीं। Airgram टैब चार स्तरों को इसी कारण एक साथ दिखाता है: ऊँचाई के साथ धीरे-धीरे बढ़ती हवा सामान्य है, अचानक उछाल या दिशा का तीखा मोड़ ही टालने योग्य है।",
      ],
    },
    {
      tieuDe: "व्युत्क्रमण — अदृश्य ढक्कन",
      y: [
        "सामान्यतः ऊँचाई के साथ हवा ठंडी होती है। व्युत्क्रमण वह परत है जहाँ ऊपर नीचे से गर्म होता है, प्रायः साफ़ रात में बनती है। यह ढक्कन की तरह काम करती है: उठता थर्मल बुलबुला वहीं रुक जाता है, इसलिए छत नीची और उड़ानें छोटी रहती हैं।",
        "यह कोहरे और नीचे के बादलों को घाटी में देर सुबह तक रोके रखती है — इसीलिए वर्षा शून्य होने पर भी दर्रा सफ़ेद दिखता है। धूप पर्याप्त तपे तो ढक्कन टूटता है और कोहरा एक घंटे में छँट जाता है; यह पृष्ठ अनुमानित समय बताता है।",
      ],
    },
    {
      tieuDe: "थर्मल — उड़ान का ईंधन",
      y: [
        "ज़मीन विकिरण सोखती है, उससे सटी हवा गर्म होती है, और गर्म बुलबुले टूटकर ऊपर उठते हैं — यही थर्मल है। इसे दो संख्याएँ बताती हैं: CAPE (संवहन के लिए कितना 'ईंधन') और मिश्रण-परत की ऊँचाई (बुलबुला कहाँ तक जाएगा), जिसे यहाँ थर्मल छत कहा गया है।",
        "यहाँ का पैमाना कोमलता की ओर है: मध्यम थर्मल लंबी और आरामदेह उड़ान देते हैं, जबकि तीखे थर्मल विंग को झटकाते हैं और लैंडिंग मैदान में बवंडर उठते हैं। क्रॉस-कंट्री पायलट इसे उल्टा पढ़ते हैं — उन्हें तेज़ चाहिए।",
      ],
    },
    {
      tieuDe: "बादल, वर्षा और आँधी-तूफ़ान",
      y: [
        "बादल का आधार तापमान और ओसांक के अंतर से निकलता है (हर 1 °C पर लगभग 125 मी), और उसमें मॉडल ग्रिड तथा असली टेक-ऑफ़ की ऊँचाई का अंतर जोड़ा जाता है। आधार टेक-ऑफ़ से नीचे होने का अर्थ है टेक-ऑफ़ बादल के भीतर: न ढलान दिखेगी, न लैंडिंग — उड़ान नहीं।",
        "वर्षा प्रतिशत में नहीं, प्रति घंटा मिलीमीटर में आँकी जाती है — मॉडल का प्रतिशत कहता है '25 किमी के खाने में कहीं वर्षा', जो बरसात में हर दिन 90% रहता है। असली ख़तरा बूँदें नहीं, गरज वाला तूफ़ान है: बादल आने से पहले उसकी अवरोही हवा टेक-ऑफ़ पर से गुज़रती है और मिनटों में दिशा पलटकर गति कई गुना कर देती है। 40% तूफ़ान जोखिम ही न उड़ने का पर्याप्त कारण है।",
      ],
    },
  ],
  good: "उड़ान के लिए अच्छा",
  fair: "सावधानी ज़रूरी",
  bad: "उड़ान नहीं",
  wind: "हवा",
  gust: "झोंके",
  rain: "वर्षा",
  direction: "दिशा",
  cloud: "बादल",
  sky: "आसमान",
  hour: "समय",
  windUnit: "मी/से",
  rainChance: "वर्षा की संभावना",
  storm: "तूफ़ान",
  cloudBase: "बादल की ऊँचाई",
  thermal: "थर्मल",
  sunHours: "धूप के घंटे",
  goodSunset: "सुंदर सूर्यास्त की संभावना",
  takeoff: "टेक-ऑफ़",
  landing: "लैंडिंग",
  heightDiff: "ऊँचाई अंतर",
  thermalPotential: "थर्मल क्षमता",
  thermalWindow: "चरम",
  thermalHours: "घंटे थर्मल",
  canFly: "उड़ान?",
  score: "स्कोर",
  stability: "स्थिरता",
  thermalLevels: { khong: "बहुत हल्का", nhe: "हल्का", vua: "मध्यम", manh: "तेज़", gat: "बहुत तेज़" },
  today: "आज",
  bestWindow: "सर्वोत्तम समय",
  noWindow: "कोई अच्छा समय नहीं",
  goodHours: "अच्छे घंटे",
  source: "स्रोत",
  updated: "अद्यतन",
  loading: "पूर्वानुमान लाया जा रहा है…",
  error: "मौसम पूर्वानुमान नहीं मिल सका",
  retry: "फिर कोशिश करें",
  seeSpot: "स्थल विवरण",
  ground: "ज़मीन",
  swipeDays: "अगले दिनों के लिए बग़ल में स्वाइप करें · ऊपर किसी दिन पर टैप करें · वर्षा स्तंभ: नीला = वर्षा, नारंगी = गरज के साथ बौछार",
  sunrise: "सूर्योदय",
  sunset: "सूर्यास्त",
  assessment: "उड़ान दिवस का आकलन",
  confidence: "विश्वसनीयता",
  hourShort: "घं",
  noRain: "वर्षा नहीं",
  lightRain: "हल्की बूंदाबांदी — उड़ान संभव",
  strongGusts: "तेज़ झोंके",
  cloudCover: "बादल",
  verdictGood: "उड़ान के लिए अच्छी परिस्थितियाँ।",
  verdictFair: "उड़ान संभव पर सीमित — ऊपर जाने से पहले पायलट से पूछें।",
  verdictBad: "आज उड़ना कठिन है; पायलट लॉन्च पर तय करेंगे, मौसम खुलने पर मौका बन सकता है।",
  bookNow: "उड़ान बुक करें",
  widgetTitle: "अगले 10 दिन का उड़ान मौसम",
  widgetNote: "टेक-ऑफ़ की सटीक स्थिति का पूर्वानुमान",
  mapToggleOpen: "Windy पवन मानचित्र देखें",
  mapToggleClose: "पवन मानचित्र छिपाएँ",
  disclaimer:
    "पूर्वानुमान केवल संकेत मात्र है। उड़ान का निर्णय पायलट मौके पर लेता है, सुरक्षा सर्वोपरि; मौसम के कारण स्थगित होने पर तिथि बदली जा सकती है या धन वापस मिलता है।",
};

const BANG: Record<ThoiTietLang, ThoiTietCopy> = { vi, en, fr, ru, zh, hi };

export function getThoiTietCopy(lang?: string): ThoiTietCopy {
  return BANG[(lang as ThoiTietLang) ?? "vi"] ?? vi;
}

/** Tên hướng gió theo từng thứ tiếng — 16 hướng, bắt đầu từ Bắc. */
const HUONG: Record<ThoiTietLang, string[]> = {
  vi: ["B", "BĐB", "ĐB", "ĐĐB", "Đ", "ĐĐN", "ĐN", "NĐN", "N", "NTN", "TN", "TTN", "T", "TTB", "TB", "BTB"],
  en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  ru: ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"],
  zh: ["北", "北北东", "东北", "东北东", "东", "东南东", "东南", "南南东", "南", "南南西", "西南", "西南西", "西", "西北西", "西北", "北北西"],
  hi: ["उ", "उउपू", "उपू", "पूउपू", "पू", "पूदपू", "दपू", "दक्षिपू", "द", "ददप", "दप", "पदप", "प", "पउप", "उप", "उउप"],
};

/**
 * Tên hướng ĐẦY ĐỦ, tám hướng — cho câu nói ("gió BẮC 2,3 m/s"), chỗ mà chữ
 * tắt "BĐB" người không quen đọc không ra (chủ 11/09: hướng gió là thứ quan
 * trọng nhất trên dòng tóm tắt, phải đọc được ngay).
 */
const HUONG_DAY_DU: Record<ThoiTietLang, string[]> = {
  vi: ["Bắc", "Đông Bắc", "Đông", "Đông Nam", "Nam", "Tây Nam", "Tây", "Tây Bắc"],
  en: ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"],
  fr: ["Nord", "Nord-Est", "Est", "Sud-Est", "Sud", "Sud-Ouest", "Ouest", "Nord-Ouest"],
  ru: ["Север", "Северо-восток", "Восток", "Юго-восток", "Юг", "Юго-запад", "Запад", "Северо-запад"],
  zh: ["北", "东北", "东", "东南", "南", "西南", "西", "西北"],
  hi: ["उत्तर", "उत्तर-पूर्व", "पूर्व", "दक्षिण-पूर्व", "दक्षिण", "दक्षिण-पश्चिम", "पश्चिम", "उत्तर-पश्चिम"],
};

export function huongDayDu(do_: number, lang?: string): string {
  const bang = HUONG_DAY_DU[(lang as ThoiTietLang) ?? "vi"] ?? HUONG_DAY_DU.vi;
  const h = ((do_ % 360) + 360) % 360;
  return bang[Math.round(h / 45) % 8];
}

export function huongTheoNgonNgu(do_: number, lang?: string): string {
  const bang = HUONG[(lang as ThoiTietLang) ?? "vi"] ?? HUONG.vi;
  const h = ((do_ % 360) + 360) % 360;
  return bang[Math.round(h / 22.5) % 16];
}
