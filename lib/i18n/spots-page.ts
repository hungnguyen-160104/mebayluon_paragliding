// lib/i18n/spots-page.ts
/**
 * Nội dung bổ sung cho trang danh sách /spots.
 *
 * Lý do có file này: trang /spots trước đây chỉ có tiêu đề + 6 thẻ điểm bay,
 * tổng cộng khoảng 310 từ kể cả menu và chân trang — quá mỏng để Google coi là
 * trang đáng lập chỉ mục, và cũng không đủ để khách quyết định nên bay ở đâu.
 *
 * Phần FAQ còn được dựng thành JSON-LD FAQPage nên có thể hiện dạng câu hỏi
 * mở rộng ngay trên kết quả tìm kiếm.
 */

export type SpotsPageLang = "vi" | "en" | "fr" | "ru" | "zh" | "hi";

type Card = { title: string; body: string };
type Faq = { q: string; a: string };

export type SpotsPageCopy = {
  intro: string[];
  chooseTitle: string;
  chooseSubtitle: string;
  chooseCards: Card[];
  faqTitle: string;
  faqs: Faq[];
};

const vi: SpotsPageCopy = {
  intro: [
    "Mebayluon đang khai thác sáu điểm bay dù lượn trải từ ngoại ô Hà Nội lên Tây Bắc và vào tới Đà Nẵng. Mỗi nơi một kiểu địa hình và một mùa đẹp riêng: có nơi bay trên ruộng bậc thang mùa vàng, có nơi bay trên biển mây, có nơi cất cánh từ đỉnh núi rồi hạ xuống ngay bãi biển.",
    "Mebayluon khai thác cả hai loại hình: dù lượn không động cơ và dù lượn có động cơ. Dù lượn không động cơ bay theo gió và theo địa hình, cảm giác êm và yên tĩnh. Còn nếu bạn muốn bay chủ động, lên cao theo ý mình, và nhất là bay ngắm hoàng hôn hay bay săn mây lúc sáng sớm, hãy chọn dù lượn có động cơ — đảm bảo bạn sẽ không hề tiếc nuối.",
    "Toàn bộ điểm bay đều do phi công có chứng nhận chuyên môn của chúng tôi phụ trách, dùng chung một bộ tiêu chuẩn về trang thiết bị, bảo hiểm và quy trình an toàn. Khác nhau là cảnh quan, độ cao cất cánh, quãng đường di chuyển và khoảng thời gian bạn cần bỏ ra cho cả hành trình.",
    "Bấm vào từng điểm bay để xem chi tiết độ cao, thời lượng bay, giá gói, vị trí bãi cất – hạ cánh trên Google Maps và ảnh thực tế do khách chụp.",
  ],
  chooseTitle: "Chọn điểm bay nào?",
  chooseSubtitle:
    "Ba câu hỏi thường quyết định được điểm bay phù hợp với bạn.",
  chooseCards: [
    {
      title: "Bạn có bao nhiêu thời gian?",
      body: "Chỉ rảnh nửa ngày và xuất phát từ Hà Nội thì Đồi Bù hoặc Viên Nam là lựa chọn duy nhất hợp lý — đi và về gọn trong 3–5 giờ. Có trọn hai ngày cuối tuần thì Khau Phạ, Sa Pa hay Trạm Tấu xứng đáng với quãng đường.",
    },
    {
      title: "Bạn muốn ngắm gì?",
      body: "Ruộng bậc thang thì Khau Phạ và Sa Pa đẹp nhất, rõ nét vào mùa nước đổ (tháng 4–5) và mùa lúa chín (tháng 9–10). Muốn bay trên biển mây thì đi sáng sớm ở Khau Phạ, Sa Pa hoặc Trạm Tấu. Thích biển thì Sơn Trà là nơi duy nhất cất cánh từ núi và bay ra bờ biển.",
    },
    {
      title: "Bạn muốn bay lâu và bay cao?",
      body: "Dù lượn thường phụ thuộc vào gió, thời gian trên không khoảng 10–20 phút. Muốn chủ động độ cao và thời lượng thì chọn dù lượn gắn động cơ — hiện chỉ có tại Khau Phạ, bay được tới 2.000m và tự chọn 10–25 phút. Đây cũng là lựa chọn hợp lý nhất cho bay ngắm hoàng hôn và bay săn mây.",
    },
  ],
  faqTitle: "Câu hỏi thường gặp về các điểm bay",
  faqs: [
    {
      q: "Điểm bay nào gần Hà Nội nhất?",
      a: "Đồi Bù và Viên Nam, đều thuộc ngoại thành Hà Nội, cách trung tâm khoảng 50–60 km. Cả chuyến đi và về gói gọn trong 3–5 giờ nên bay được trong ngày, có lịch bay hằng ngày.",
    },
    {
      q: "Nên bay dù lượn Mù Cang Chải vào tháng mấy?",
      a: "Hai mùa đẹp nhất là mùa nước đổ khoảng tháng 4–5, khi ruộng bậc thang ngập nước sáng như gương, và mùa lúa chín khoảng tháng 9–10, khi cả thung lũng ngả vàng. Bay săn mây thì đẹp nhất vào sáng sớm sau một đêm mưa hoặc trời lạnh.",
    },
    {
      q: "Người chưa bay bao giờ có bay được không?",
      a: "Được. Toàn bộ chuyến bay tại các điểm này đều là bay đôi: phi công điều khiển hoàn toàn, khách chỉ ngồi và ngắm cảnh. Khách từ 3 tuổi trở lên, cân nặng dưới 120 kg và không mắc các bệnh lý chống chỉ định đều tham gia được.",
    },
    {
      q: "Điểm bay nào bay được cả khi trời lặng gió?",
      a: "Đèo Khau Phạ, nhờ có dịch vụ dù lượn gắn động cơ. Động cơ giúp cất cánh từ mặt bằng phẳng và lên cao chủ động, không phải chờ gió như dù lượn thường.",
    },
    {
      q: "Có xe đưa đón tới điểm bay không?",
      a: "Có. Ở tất cả các điểm bay đều có xe lên xuống núi giữa bãi cất cánh và bãi hạ cánh. Ngoài ra bạn có thể đăng ký thêm tuỳ chọn xe đón trả hai chiều từ khách sạn hoặc điểm hẹn ngay khi đặt bay.",
    },
    {
      q: "Trời mưa hoặc gió lớn thì sao?",
      a: "Chuyến bay được đổi lịch hoặc huỷ hoàn toàn miễn phí, hoàn 100% số tiền đã thanh toán. An toàn bay là ưu tiên cao nhất và quyết định cuối cùng thuộc về phi công tại hiện trường.",
    },
    {
      q: "Chuyến bay có được quay chụp lại không?",
      a: "Có. Tất cả điểm bay đều có tuỳ chọn quay chụp: flycam bay theo suốt chuyến và camera 360 gắn trên dù. Mỗi chuyến bay cũng đã có sẵn ảnh và video quay bằng GoPro miễn phí. Bạn chọn kèm ngay khi đặt bay; chọn cả flycam lẫn camera 360 thì được giảm giá combo.",
    },
    {
      q: "Có được mang theo đồ ăn, đồ uống không?",
      a: "Được. Bạn có thể mang theo đồ ăn, thậm chí thưởng thức đồ uống ngay khi đang bay trên trời. Ở một số điểm bay còn kết hợp được thêm những trải nghiệm khác trong cùng chuyến đi — cứ báo trước để chúng tôi sắp xếp.",
    },
    {
      q: "Có cần đặt lịch trước không?",
      a: "Hầu hết khách đều đặt lịch trước để bên tổ chức bay nắm được số lượng và chuẩn bị chu đáo hơn, đồng thời sớm thông báo đến bạn nếu có thay đổi do yếu tố khách quan như thời tiết. Bạn đừng lo giữ chỗ: mọi đặt lịch đều được huỷ hoặc đổi lịch miễn phí, chỉ cần báo trước vài giờ.",
    },
  ],
};

const en: SpotsPageCopy = {
  intro: [
    "Mebayluon operates six paragliding sites, from the outskirts of Hanoi up through the Northwest mountains and down to Da Nang. Each has its own terrain and its own best season: rice terraces in the golden season at one, a sea of cloud at another, a mountain launch that lands on the beach at a third.",
    "We operate both forms of the sport: unpowered paragliding and powered paragliding. An unpowered flight follows the wind and the terrain — quiet and smooth. If you would rather fly on your own terms, climb as high as you like, and above all catch a sunset flight or an early-morning cloud hunt, choose powered paragliding; we promise you will not regret it.",
    "Every site is run by our certified pilots under the same standards for equipment, insurance and safety procedure. What differs is the scenery, the launch altitude, the travel distance and how much of your day the whole trip takes.",
    "Open any site for its altitude, airtime, package price, take-off and landing points on Google Maps, and real photos taken by guests.",
  ],
  chooseTitle: "Which site should you pick?",
  chooseSubtitle: "Three questions usually settle it.",
  chooseCards: [
    {
      title: "How much time do you have?",
      body: "With half a day from Hanoi, Doi Bu or Vien Nam are the only sensible options — the whole round trip fits in 3–5 hours. With a full weekend, Khau Pha, Sapa or Tram Tau are worth the drive.",
    },
    {
      title: "What do you want to see?",
      body: "For rice terraces, Khau Pha and Sapa are the best, at their sharpest during the water-pouring season (April–May) and the golden harvest (September–October). For a sea of cloud, fly early morning at Khau Pha, Sapa or Tram Tau. For the coast, Son Tra is the only site that launches from a mountain and flies out over the beach.",
    },
    {
      title: "Do you want to fly longer and higher?",
      body: "Unpowered paragliding depends on the wind, with roughly 10–20 minutes of airtime. If you want control over height and duration, choose powered paragliding — available only at Khau Pha, up to 2,000 m with 10–25 minutes of your choosing. It is also the better choice for sunset flights and cloud hunting.",
    },
  ],
  faqTitle: "Frequently asked questions about our sites",
  faqs: [
    {
      q: "Which site is closest to Hanoi?",
      a: "Doi Bu and Vien Nam, both on the edge of Hanoi, about 50–60 km from the centre. The round trip takes 3–5 hours, so it works as a day out, and both fly daily.",
    },
    {
      q: "When is the best month to fly in Mu Cang Chai?",
      a: "Two seasons stand out: the water-pouring season around April–May, when the flooded terraces shine like mirrors, and the golden harvest around September–October, when the whole valley turns yellow. For cloud flying, early morning after a rainy night or on a cold day is best.",
    },
    {
      q: "Can complete beginners fly?",
      a: "Yes. Every flight at these sites is a tandem flight: the pilot flies, you sit and enjoy the view. Guests from 3 years old, under 120 kg and without the listed medical conditions can take part.",
    },
    {
      q: "Which site can fly even when there is no wind?",
      a: "Khau Pha, thanks to its powered paragliding. The engine lets you take off from flat ground and climb on demand instead of waiting for wind.",
    },
    {
      q: "Is transport to the site available?",
      a: "Yes. At every site a vehicle runs up and down the mountain between the take-off and the landing field. On top of that you can add optional two-way transfers from your hotel or a meeting point when you book.",
    },
    {
      q: "What happens if it rains or the wind is too strong?",
      a: "The flight is rescheduled or cancelled free of charge with a full refund. Safety comes first, and the final call rests with the pilot on site.",
    },
    {
      q: "Can the flight be filmed?",
      a: "Yes. Every site offers filming options: a flycam that follows you throughout the flight, and a 360 camera mounted on the wing. Free GoPro photos and video already come with every flight. Add them when you book — choosing both the flycam and the 360 camera earns a combo discount.",
    },
    {
      q: "Can I bring my own food and drink?",
      a: "Yes. You are welcome to bring food, and you can even enjoy a drink while airborne. At some sites the flight can be combined with other experiences on the same trip — just tell us in advance so we can arrange it.",
    },
    {
      q: "Do I need to book in advance?",
      a: "Most guests book ahead so we know the numbers, prepare properly, and can tell you early if anything changes for reasons beyond our control, such as the weather. There is no risk in holding a slot: every booking can be cancelled or rescheduled free of charge with just a few hours' notice.",
    },
  ],
};

const fr: SpotsPageCopy = {
  intro: [
    "Mebayluon exploite six sites de parapente, des portes de Hanoï aux montagnes du Nord-Ouest jusqu’à Da Nang. Chacun a son relief et sa saison : rizières en terrasses à la saison dorée pour l’un, mer de nuages pour l’autre, décollage en montagne et atterrissage sur la plage pour un troisième.",
    "Nous exploitons les deux formes du sport : le parapente sans moteur et le parapente motorisé. Sans moteur, le vol suit le vent et le relief — calme et fluide. Si vous préférez voler à votre initiative, monter aussi haut que vous le souhaitez et surtout profiter d’un vol au coucher du soleil ou d’une chasse aux nuages au petit matin, choisissez le paramoteur : vous ne le regretterez pas.",
    "Tous les sites sont encadrés par nos pilotes certifiés, selon les mêmes standards de matériel, d’assurance et de procédure de sécurité. Ce qui change, c’est le paysage, l’altitude de décollage, la distance et le temps que prend l’ensemble de la sortie.",
    "Ouvrez chaque site pour connaître l’altitude, la durée de vol, le prix du forfait, les points de décollage et d’atterrissage sur Google Maps, ainsi que les photos prises par nos clients.",
  ],
  chooseTitle: "Quel site choisir ?",
  chooseSubtitle: "Trois questions suffisent généralement à trancher.",
  chooseCards: [
    {
      title: "De combien de temps disposez-vous ?",
      body: "Avec une demi-journée au départ de Hanoï, Doi Bu ou Vien Nam sont les seules options raisonnables : l’aller-retour tient en 3 à 5 heures. Avec un week-end entier, Khau Pha, Sapa ou Tram Tau valent le trajet.",
    },
    {
      title: "Que voulez-vous voir ?",
      body: "Pour les rizières en terrasses, Khau Pha et Sapa sont les plus belles, au mieux pendant la saison des rizières inondées (avril–mai) et la moisson dorée (septembre–octobre). Pour la mer de nuages, volez tôt le matin à Khau Pha, Sapa ou Tram Tau. Pour la côte, Son Tra est le seul site qui décolle en montagne et survole la plage.",
    },
    {
      title: "Voulez-vous voler plus longtemps et plus haut ?",
      body: "Le parapente classique dépend du vent, avec environ 10 à 20 minutes de vol. Pour maîtriser l’altitude et la durée, choisissez le paramoteur — disponible uniquement à Khau Pha, jusqu’à 2 000 m et de 10 à 25 minutes au choix. C’est aussi le meilleur choix pour les vols au coucher du soleil et la chasse aux nuages.",
    },
  ],
  faqTitle: "Questions fréquentes sur nos sites de vol",
  faqs: [
    {
      q: "Quel site est le plus proche de Hanoï ?",
      a: "Doi Bu et Vien Nam, tous deux aux portes de Hanoï, à environ 50–60 km du centre. L’aller-retour prend 3 à 5 heures, ce qui en fait une sortie à la journée, et les deux volent tous les jours.",
    },
    {
      q: "Quel est le meilleur mois pour voler à Mu Cang Chai ?",
      a: "Deux saisons se détachent : la saison des rizières inondées vers avril–mai, quand les terrasses brillent comme des miroirs, et la moisson dorée vers septembre–octobre, quand toute la vallée jaunit. Pour la mer de nuages, privilégiez le petit matin après une nuit de pluie ou par temps froid.",
    },
    {
      q: "Un débutant complet peut-il voler ?",
      a: "Oui. Tous les vols sur ces sites sont des vols biplaces : le pilote pilote, vous profitez du paysage. Les personnes à partir de 3 ans, de moins de 120 kg et sans les contre-indications médicales listées peuvent participer.",
    },
    {
      q: "Quel site permet de voler même sans vent ?",
      a: "Khau Pha, grâce au paramoteur. Le moteur permet de décoller d’un terrain plat et de monter à la demande, sans attendre le vent.",
    },
    {
      q: "Un transport jusqu’au site est-il proposé ?",
      a: "Oui. Sur chaque site, un véhicule assure la montée et la descente entre l’aire de décollage et l’aire d’atterrissage. Vous pouvez en outre ajouter, au moment de la réservation, un transfert aller-retour depuis votre hôtel ou un point de rendez-vous.",
    },
    {
      q: "Et s’il pleut ou si le vent est trop fort ?",
      a: "Le vol est reporté ou annulé sans frais, avec remboursement intégral. La sécurité prime et la décision finale revient au pilote sur place.",
    },
    {
      q: "Le vol peut-il être filmé ?",
      a: "Oui. Tous les sites proposent des options de prise de vue : un drone qui vous suit pendant le vol et une caméra 360 fixée sur la voile. Des photos et vidéos GoPro sont déjà incluses gratuitement dans chaque vol. Ajoutez-les à la réservation ; choisir à la fois le drone et la caméra 360 donne droit à une remise combinée.",
    },
    {
      q: "Puis-je apporter à manger et à boire ?",
      a: "Oui. Vous pouvez apporter de quoi manger, et même savourer une boisson en plein vol. Sur certains sites, le vol se combine à d’autres expériences dans la même sortie — prévenez-nous à l’avance pour que nous puissions l’organiser.",
    },
    {
      q: "Faut-il réserver à l’avance ?",
      a: "La plupart des clients réservent afin que nous connaissions le nombre de participants, préparions tout correctement et puissions vous prévenir tôt en cas de changement indépendant de notre volonté, comme la météo. Réserver ne vous engage à rien : toute réservation peut être annulée ou modifiée gratuitement, en prévenant quelques heures à l’avance.",
    },
  ],
};

const ru: SpotsPageCopy = {
  intro: [
    "Mebayluon работает на шести площадках для парапланеризма — от окраин Ханоя через горы Северо-Запада до Дананга. У каждой свой рельеф и свой лучший сезон: где-то террасные поля в золотую пору, где-то море облаков, где-то старт с горы и посадка прямо на пляж.",
    "Мы работаем в обоих форматах: параплан без мотора и параплан с мотором. Безмоторный полёт идёт по ветру и рельефу — тихо и плавно. А если хочется лететь по своей воле, набирать высоту сколько пожелаете и особенно застать закат или утреннюю охоту за облаками, выбирайте парамотор — вы точно не пожалеете.",
    "Все площадки ведут наши сертифицированные пилоты по единым стандартам снаряжения, страхования и процедур безопасности. Различаются пейзаж, высота старта, расстояние и то, сколько времени займёт вся поездка.",
    "Откройте любую площадку, чтобы увидеть высоту, время в воздухе, цену пакета, точки старта и посадки на Google Maps и реальные фото гостей.",
  ],
  chooseTitle: "Какую площадку выбрать?",
  chooseSubtitle: "Обычно всё решают три вопроса.",
  chooseCards: [
    {
      title: "Сколько у вас времени?",
      body: "Если из Ханоя есть только полдня, разумны лишь Doi Bu или Vien Nam — вся поездка укладывается в 3–5 часов. Если есть полные выходные, Khau Pha, Sapa или Tram Tau стоят дороги.",
    },
    {
      title: "Что хотите увидеть?",
      body: "Ради террасных полей выбирайте Khau Pha и Sapa — они лучше всего в сезон залитых водой полей (апрель–май) и в золотую жатву (сентябрь–октябрь). Ради моря облаков летите рано утром на Khau Pha, Sapa или Tram Tau. Ради побережья — Son Tra: единственная площадка со стартом с горы и полётом над пляжем.",
    },
    {
      title: "Хотите летать дольше и выше?",
      body: "Обычный параплан зависит от ветра, время в воздухе примерно 10–20 минут. Если нужен контроль высоты и длительности, выбирайте парамотор — он есть только на Khau Pha: до 2 000 м и 10–25 минут на ваш выбор. Это же лучший вариант для полёта на закате и для охоты за облаками.",
    },
  ],
  faqTitle: "Частые вопросы о площадках",
  faqs: [
    {
      q: "Какая площадка ближе всего к Ханою?",
      a: "Doi Bu и Vien Nam — обе на окраине Ханоя, примерно в 50–60 км от центра. Поездка туда и обратно занимает 3–5 часов, так что это вариант на один день; полёты там каждый день.",
    },
    {
      q: "В каком месяце лучше лететь в Му Канг Чай?",
      a: "Выделяются два сезона: залитые водой террасы примерно в апреле–мае, когда поля блестят как зеркала, и золотая жатва в сентябре–октябре, когда вся долина желтеет. Для полёта над облаками лучше раннее утро после дождливой ночи или в холодный день.",
    },
    {
      q: "Может ли полететь новичок без опыта?",
      a: "Да. Все полёты здесь тандемные: пилот управляет, вы просто смотрите по сторонам. Участвовать могут гости от 3 лет, весом до 120 кг и без перечисленных медицинских противопоказаний.",
    },
    {
      q: "Где можно летать даже в полный штиль?",
      a: "На Khau Pha — благодаря парамотору. Мотор позволяет стартовать с ровной площадки и набирать высоту по желанию, не дожидаясь ветра.",
    },
    {
      q: "Есть ли трансфер до площадки?",
      a: "Да. На каждой площадке есть машина, которая возит вверх и вниз по горе между стартом и местом посадки. Кроме того, при бронировании можно добавить трансфер в обе стороны от отеля или места встречи.",
    },
    {
      q: "Что если дождь или слишком сильный ветер?",
      a: "Полёт переносится или отменяется бесплатно с полным возвратом. Безопасность важнее всего, и последнее слово за пилотом на месте.",
    },
    {
      q: "Полёт можно снять на видео?",
      a: "Да. На всех площадках есть опции съёмки: дрон, который сопровождает вас в полёте, и камера 360 на крыле. Фото и видео с GoPro уже входят в каждый полёт бесплатно. Добавьте съёмку при бронировании: если выбрать и дрон, и камеру 360, действует скидка на комбо.",
    },
    {
      q: "Можно взять с собой еду и напитки?",
      a: "Да. Еду брать можно, а напитком разрешается насладиться даже прямо в воздухе. На некоторых площадках полёт совмещается с другими впечатлениями в той же поездке — предупредите нас заранее, и мы всё организуем.",
    },
    {
      q: "Нужно ли бронировать заранее?",
      a: "Большинство гостей бронируют заранее, чтобы мы знали количество, подготовились как следует и вовремя предупредили вас, если что-то изменится по независящим от нас причинам, например из-за погоды. Опасаться нечего: любое бронирование можно бесплатно отменить или перенести, предупредив за несколько часов.",
    },
  ],
};

const zh: SpotsPageCopy = {
  intro: [
    "Mebayluon 目前运营六个滑翔伞飞行点，从河内近郊一路延伸到西北山区，再到岘港。每个点的地形和最佳季节都不同：有的飞越金色稻季的梯田，有的飞越云海，还有的从山顶起飞、直接降落到海滩。",
    "我们同时运营两种飞行方式：无动力滑翔伞与动力滑翔伞。无动力滑翔伞顺着风与地形飞行，安静而平顺。如果您想自主掌控、随心爬升，尤其是想飞黄昏日落或清晨云海，请选择动力滑翔伞——相信您绝不会后悔。",
    "所有飞行点均由我们持证的飞行员负责，装备、保险与安全流程标准完全一致。差别在于景观、起飞高度、路程远近，以及整趟行程需要花费的时间。",
    "点击任一飞行点即可查看高度、飞行时长、套餐价格、Google 地图上的起降点位置，以及客人拍摄的实景照片。",
  ],
  chooseTitle: "该选哪个飞行点？",
  chooseSubtitle: "通常三个问题就能决定。",
  chooseCards: [
    {
      title: "您有多少时间？",
      body: "从河内出发只有半天，Doi Bu 或 Vien Nam 是唯一合理的选择——往返只需 3–5 小时。若有完整的周末，Khau Pha、Sapa 或 Tram Tau 值得这段车程。",
    },
    {
      title: "您想看什么？",
      body: "看梯田，Khau Pha 与 Sapa 最美，灌水季（4–5 月）与金色稻季（9–10 月）最出彩。看云海，请在 Khau Pha、Sapa 或 Tram Tau 选清晨时段。想看海，Son Tra 是唯一从山顶起飞、飞越海滩的飞行点。",
    },
    {
      title: "想飞得更久、更高？",
      body: "无动力滑翔伞依赖风况，空中时间约 10–20 分钟。若想自主掌控高度与时长，请选动力滑翔伞——仅 Khau Pha 提供，最高 2,000 米，时长 10–25 分钟自选。飞黄昏日落与清晨云海，也以动力滑翔伞最为合适。",
    },
  ],
  faqTitle: "关于飞行点的常见问题",
  faqs: [
    {
      q: "哪个飞行点离河内最近？",
      a: "Doi Bu 和 Vien Nam，均位于河内近郊，距市中心约 50–60 公里。往返 3–5 小时，可当天来回，且每天都可飞。",
    },
    {
      q: "几月去木江界飞最好？",
      a: "两个季节最出色：4–5 月的灌水季，梯田蓄水如镜；9–10 月的金色稻季，整条山谷染成金黄。想飞云海，则以雨夜之后或转凉日子的清晨最佳。",
    },
    {
      q: "完全没经验也能飞吗？",
      a: "可以。这些飞行点的飞行全部为双人飞行：由飞行员操控，您只需安坐赏景。3 周岁以上、体重 120 公斤以下且无所列健康禁忌的客人均可参加。",
    },
    {
      q: "哪个飞行点无风也能飞？",
      a: "Khau Pha，因为那里有动力滑翔伞。发动机可从平地起飞并按需爬升，无需等风。",
    },
    {
      q: "有接送车前往飞行点吗？",
      a: "有。所有飞行点都配有往返起飞场与降落场之间的上下山车辆。此外，您还可以在预订时加购从酒店或集合点出发的往返接送。",
    },
    {
      q: "遇到下雨或大风怎么办？",
      a: "免费改期或取消，全额退款。安全永远优先，最终由现场飞行员判断。",
    },
    {
      q: "飞行过程可以拍摄吗？",
      a: "可以。所有飞行点都提供拍摄选项：全程跟飞的航拍无人机，以及固定在伞上的 360 相机。每次飞行本身已免费包含 GoPro 拍摄的照片与视频。预订时一并加购即可；同时选择无人机与 360 相机可享套餐折扣。",
    },
    {
      q: "可以自带食物和饮品吗？",
      a: "可以。您可以自带食物，甚至在空中享用饮品。部分飞行点还能在同一趟行程中结合其他体验——请提前告知，我们好为您安排。",
    },
    {
      q: "需要提前预订吗？",
      a: "大多数客人都会提前预订，让我们掌握人数、做好充分准备，并在遇到天气等客观因素变动时尽早通知您。不必担心：所有预订都可免费取消或改期，只需提前几小时告知。",
    },
  ],
};

const hi: SpotsPageCopy = {
  intro: [
    "Mebayluon छह पैराग्लाइडिंग स्थल संचालित करता है — हनोई के बाहरी इलाक़े से उत्तर-पश्चिमी पहाड़ों तक और दा नांग तक। हर जगह का भूभाग और सबसे अच्छा मौसम अलग है: कहीं सुनहरे धान के मौसम की सीढ़ीदार खेतियाँ, कहीं बादलों का समुद्र, तो कहीं पहाड़ से टेक-ऑफ़ और सीधे समुद्र तट पर लैंडिंग।",
    "हम दोनों तरह की उड़ानें संचालित करते हैं: बिना इंजन वाली पैराग्लाइडिंग और इंजन वाली पैराग्लाइडिंग। बिना इंजन की उड़ान हवा और भूभाग के साथ चलती है — शांत और सहज। पर अगर आप अपनी मर्ज़ी से उड़ना चाहते हैं, जितना चाहें ऊपर चढ़ना चाहते हैं और ख़ासकर सूर्यास्त की उड़ान या सुबह-सुबह बादलों का पीछा करना चाहते हैं, तो पैरामोटर चुनिए — यक़ीन मानिए, अफ़सोस नहीं होगा।",
    "सभी स्थल हमारे प्रमाणित पायलटों के ज़िम्मे हैं और उपकरण, बीमा तथा सुरक्षा प्रक्रिया के मानक एक जैसे हैं। फ़र्क़ सिर्फ़ नज़ारे, टेक-ऑफ़ ऊँचाई, दूरी और पूरी यात्रा में लगने वाले समय का है।",
    "किसी भी स्थल पर क्लिक करें और देखें ऊँचाई, उड़ान अवधि, पैकेज मूल्य, Google Maps पर टेक-ऑफ़/लैंडिंग स्थान और मेहमानों की खींची असली तस्वीरें।",
  ],
  chooseTitle: "कौन-सा स्थल चुनें?",
  chooseSubtitle: "आमतौर पर तीन सवाल ही फ़ैसला कर देते हैं।",
  chooseCards: [
    {
      title: "आपके पास कितना समय है?",
      body: "हनोई से आधा दिन हो तो Doi Bu या Vien Nam ही समझदारी है — पूरी आवाजाही 3–5 घंटे में। पूरा सप्ताहांत हो तो Khau Pha, Sapa या Tram Tau सफ़र के लायक़ हैं।",
    },
    {
      title: "आप क्या देखना चाहते हैं?",
      body: "सीढ़ीदार खेतों के लिए Khau Pha और Sapa सबसे सुंदर हैं — पानी भरने के मौसम (अप्रैल–मई) और सुनहरी कटाई (सितंबर–अक्टूबर) में सबसे निखरे। बादलों के समुद्र के लिए Khau Pha, Sapa या Tram Tau में सुबह जल्दी उड़ें। समुद्र के लिए Son Tra इकलौता स्थल है जहाँ पहाड़ से उड़ान भरकर समुद्र तट के ऊपर जाया जाता है।",
    },
    {
      title: "लंबी और ऊँची उड़ान चाहिए?",
      body: "बिना इंजन वाली पैराग्लाइडिंग हवा पर निर्भर है, हवाई समय लगभग 10–20 मिनट। ऊँचाई और अवधि पर नियंत्रण चाहिए तो पैरामोटर चुनें — यह केवल Khau Pha पर है, 2,000 मीटर तक और 10–25 मिनट आपकी पसंद से। सूर्यास्त की उड़ान और बादलों का पीछा करने के लिए भी यही सबसे उपयुक्त है।",
    },
  ],
  faqTitle: "उड़ान स्थलों के बारे में सामान्य प्रश्न",
  faqs: [
    {
      q: "हनोई से सबसे नज़दीक कौन-सा स्थल है?",
      a: "Doi Bu और Vien Nam, दोनों हनोई के बाहरी इलाक़े में, केंद्र से लगभग 50–60 किमी। आना-जाना 3–5 घंटे में हो जाता है, इसलिए एक दिन में संभव है और वहाँ रोज़ उड़ानें होती हैं।",
    },
    {
      q: "मु कांग चाई में उड़ने का सबसे अच्छा महीना कौन-सा है?",
      a: "दो मौसम ख़ास हैं: अप्रैल–मई के आसपास पानी भरने का मौसम, जब सीढ़ीदार खेत आईने जैसे चमकते हैं, और सितंबर–अक्टूबर की सुनहरी कटाई, जब पूरी घाटी पीली हो जाती है। बादलों की उड़ान के लिए बारिश वाली रात के बाद या ठंडे दिन की सुबह सबसे अच्छी।",
    },
    {
      q: "क्या बिल्कुल नए लोग उड़ सकते हैं?",
      a: "हाँ। इन स्थलों की सभी उड़ानें टैंडम हैं: पायलट उड़ाते हैं, आप बस बैठकर नज़ारा लेते हैं। 3 वर्ष से ऊपर, 120 किग्रा से कम वज़न और सूचीबद्ध स्वास्थ्य समस्याओं से मुक्त मेहमान भाग ले सकते हैं।",
    },
    {
      q: "हवा न हो तब भी कहाँ उड़ान संभव है?",
      a: "Khau Pha पर, वहाँ पैरामोटर उपलब्ध है। इंजन से समतल ज़मीन से उड़ान भरी जा सकती है और जब चाहें ऊपर चढ़ा जा सकता है — हवा का इंतज़ार नहीं करना पड़ता।",
    },
    {
      q: "क्या स्थल तक गाड़ी की व्यवस्था है?",
      a: "हाँ। हर स्थल पर टेक-ऑफ़ और लैंडिंग मैदान के बीच पहाड़ पर चढ़ने-उतरने के लिए गाड़ी रहती है। इसके अलावा बुकिंग के समय होटल या मिलन स्थल से दोनों तरफ़ की गाड़ी भी जोड़ी जा सकती है।",
    },
    {
      q: "बारिश हो या हवा बहुत तेज़ हो तो?",
      a: "उड़ान निःशुल्क पुनर्निर्धारित या रद्द कर दी जाती है और पूरी राशि लौटा दी जाती है। सुरक्षा सर्वोपरि है और अंतिम निर्णय मौके पर मौजूद पायलट का होता है।",
    },
    {
      q: "क्या उड़ान की फ़ोटो-वीडियो बनती है?",
      a: "हाँ। सभी स्थलों पर शूटिंग के विकल्प हैं: पूरी उड़ान में साथ उड़ता फ़्लाईकैम और पंख पर लगा 360 कैमरा। हर उड़ान के साथ GoPro से ली गई तस्वीरें और वीडियो पहले से निःशुल्क शामिल हैं। बुकिंग के समय जोड़ लें — फ़्लाईकैम और 360 कैमरा दोनों चुनने पर कॉम्बो छूट मिलती है।",
    },
    {
      q: "क्या अपना खाना-पीना ला सकते हैं?",
      a: "हाँ। आप खाना ला सकते हैं, और हवा में रहते हुए पेय का आनंद भी ले सकते हैं। कुछ स्थलों पर उसी यात्रा में दूसरे अनुभव भी जोड़े जा सकते हैं — पहले बता दीजिए ताकि हम व्यवस्था कर सकें।",
    },
    {
      q: "क्या पहले से बुकिंग ज़रूरी है?",
      a: "ज़्यादातर मेहमान पहले से बुक करते हैं ताकि हमें संख्या पता रहे, तैयारी पूरी हो और मौसम जैसे बाहरी कारणों से कुछ बदले तो आपको जल्दी बताया जा सके। चिंता की बात नहीं: हर बुकिंग मुफ़्त रद्द या पुनर्निर्धारित हो सकती है, बस कुछ घंटे पहले बता दीजिए।",
    },
  ],
};

export const SPOTS_PAGE_COPY: Record<SpotsPageLang, SpotsPageCopy> = {
  vi,
  en,
  fr,
  ru,
  zh,
  hi,
};

export const getSpotsPageCopy = (lang: unknown): SpotsPageCopy => {
  const code = String(lang ?? "vi").slice(0, 2).toLowerCase() as SpotsPageLang;
  return SPOTS_PAGE_COPY[code] ?? SPOTS_PAGE_COPY.vi;
};
