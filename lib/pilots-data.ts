// lib/pilots-data.ts

export interface Pilot {
  slug: string
  name: string
  // CẬP NHẬT: Đã thay đổi 'nickname?: string' thành cấu trúc đa ngôn ngữ
  nickname: {
    vi: string
    en: string
    fr: string
    ru: string
  }
  role: string
  experience: string // Mô tả ngắn về kinh nghiệm, ví dụ: "7 năm"
  flights: string // Số chuyến bay, ví dụ: "2000+"
  hours?: string // Số giờ bay, ví dụ: "1000+ giờ"
  phone: string
  avatar: string // Ảnh đại diện chính
  hero: string // Ảnh nền chung cho trang
  gallery: string[] // Bộ sưu tập ảnh (bao gồm cả hero collage và content images)
  specialties: string[]
  certificates: string[]
  bio: {
    // Mô tả ngắn gọn, tóm tắt (dòng intro)
    vi: string
    en: string
    fr: string
    ru: string
  }
  funFacts: {
    // Mục "Cá tính"
    vi: string[]
    en: string[]
    fr: string[]
    ru: string[]
  }
  achievements: {
    // Mục "Kinh nghiệm" (dạng bullet points)
    vi: string[]
    en: string[]
    fr: string[]
    ru: string[]
  }
  flyingStyle: {
    // Mô tả phong cách bay (có thể dùng lại bio)
    vi: string
    en: string
    fr: string
    ru: string
  }
}

export const pilots: Pilot[] = [
  // === Dữ liệu 13 phi công bạn cung cấp ===
  {
    slug: "dinh-the-anh",
    name: "ĐINH THẾ ANH",
    nickname: {
      vi: "Thợ săn mây",
      en: "Cloud Hunter",
      fr: "Chasseur de Nuages",
      ru: "Охотник за Облаками",
    },
    role: "Phi công",
    experience: "Nhiều năm",
    flights: "5000+",
    hours: "1500+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/dinh-the-anh/dinh-the-anh.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/dinh-the-anh/hero-1.png",
      "/pilots/dinh-the-anh/hero-2.png",
      "/pilots/dinh-the-anh/hero-3.png",
      "/pilots/dinh-the-anh/hero-4.png",
      "/pilots/dinh-the-anh/hero-5.png",
      "/pilots/dinh-the-anh/content-1.png",
      "/pilots/dinh-the-anh/content-2.png",
      "/pilots/dinh-the-anh/content-3.png",
    ],
    specialties: ["Hạ cánh chính xác", "Nhiếp ảnh gia"],
    certificates: ["Đại diện Olympic 2023"],
    bio: {
      vi: "Phi công giàu năng lượng thể thao, từ đua xe đạp, bơi lội đến dù lượn, với trên 5,000 chuyến bay, hơn 1,500 giờ bay an toàn và 3 lần vô địch hạ cánh chính xác tại Việt Nam.",
      en: "A pilot full of sports energy, from cycling, swimming to paragliding, with 5,000 flights, over 1,500 safe flight hours, and 3-time precision landing champion in Vietnam.",
      fr: "Un pilote plein d'énergie sportive, du cyclisme à la natation en passant par le parapente, avec 5,000 vols, plus de 1,500 heures de vol en toute sécurité et 3 fois champion d'atterrissage de précision au Vietnam.",
      ru: "Пилот, полный спортивной энергии, от велоспорта и плавания до парапланеризма, с 5,000 полетами, более 1,500 часами безопасного налета и 3-кратный чемпион Вьетнама по точности приземления.",
    },
    funFacts: {
      vi: [
        "Được mệnh danh là “anh trai quốc dân” – sinh ra và lớn lên tại Đà Nẵng, chàng trai miền Trung mang trong mình nét dịu dàng, ấm áp đúng chất gió biển và nắng vàng quê hương, ấn tượng bởi nụ cười hiền khô và giọng nói trầm ấm, và anh còn khiến bao người “tan chảy” với sự chu đáo và tinh tế trong từng hành động.",
        "Không chỉ bay dù cực đỉnh mà còn là nhiếp ảnh gia chuyên nghiệp luôn đó!",
        "Thế nên khi bay cùng anh, bạn cứ yên tâm là sẽ có rất rất nhiều tấm hình siêu xịn, góc nào cũng đẹp, khoảnh khắc nào cũng đáng nhớ!",
      ],
      en: [
        "Known as the 'national big brother' – born and raised in Da Nang, this Central Vietnamese guy embodies the gentle warmth of the sea breeze and golden sun, impressing with his gentle smile, warm deep voice, and 'melting' hearts with his thoughtfulness and sophistication in every action.",
        "Not only an excellent paraglider but also a professional photographer!",
        "So when flying with him, you can rest assured that you will have many, many super high-quality photos, every angle is beautiful, every moment is memorable!",
      ],
      fr: [
        "Connu comme le 'grand frère national' – né et élevé à Da Nang, ce gars du centre du Vietnam incarne la douce chaleur de la brise marine et du soleil doré, impressionnant par son sourire doux, sa voix profonde et chaleureuse, et faisant 'fondre' les cœurs par sa prévenance et sa sophistication dans chaque action.",
        "Non seulement un excellent parapentiste, mais aussi un photographe professionnel !",
        "Donc, en volant avec lui, vous pouvez être assuré que vous aurez de très nombreuses photos de super haute qualité, chaque angle est magnifique, chaque moment est mémorable !",
      ],
      ru: [
        "Известен как 'национальный старший брат' – родился и вырос в Дананге, этот парень из Центрального Вьетнама воплощает нежное тепло морского бриза и золотого солнца, впечатляя своей мягкой улыбкой, теплым глубоким голосом и 'растопляя' сердца своей вдумчивостью и изысканностью в каждом действии.",
        "Он не только отличный парапланерист, но и профессиональный фотограф!",
        "Поэтому, летая с ним, вы можете быть уверены, что у вас будет очень-очень много супер качественных фотографий, каждый ракурс прекрасен, каждый момент незабываем!",
      ],
    },
    achievements: {
      vi: [
        "Thực hiện hơn 5.000 chuyến bay, với tổng thời gian bay an toàn vượt mốc 1.000 giờ.",
        "Đại diện Việt Nam bay thẳng sang Olympic 2023 tại Hàn Quốc.",
        "Ba lần vô địch nội dung hạ cánh chính xác trong các giải đấu quốc gia",
        "Đã từng cất cánh tại nhiều quốc gia trên thế giới như: Thụy Sĩ, Hàn Quốc, Hoa Kỳ, Thái Lan, Indonesia….",
      ],
      en: [
        "Completed over 5,000 flights, with total safe flying time exceeding 1,000 hours.",
        "Represented Vietnam to fly directly to the 2023 Olympics in Korea.",
        "Three-time champion in precision landing at national competitions.",
        "Has taken off in many countries around the world such as: Switzerland, Korea, USA, Thailand, Indonesia...",
      ],
      fr: [
        "A effectué plus de 5,000 vols, avec un temps de vol total en sécurité dépassant 1,000 heures.",
        "A représenté le Vietnam pour voler directement aux Jeux Olympiques 2023 en Corée.",
        "Triple champion d'atterrissage de précision lors de compétitions nationales.",
        "A décollé dans de nombreux pays à travers le monde tels que : la Suisse, la Corée, les États-Unis, la Thaïlande, l'Indonésie...",
      ],
      ru: [
        "Выполнил более 5000 полетов, общее безопасное время налета превышает 1,0000 часов.",
        "Представлял Вьетнам на Олимпийских играх 2023 года в Корее.",
        "Трехкратный чемпион по точности приземления на национальных соревнованиях.",
        "Взлетал во многих странах мира, таких как: Швейцария, Корея, США, Таиланд, Индонезия...",
      ],
    },
    flyingStyle: {
      vi: "Phi công giàu năng lượng thể thao, 3 lần vô địch hạ cánh chính xác.",
      en: "A pilot full of sports energy, 3-time precision landing champion.",
      fr: "Pilote plein d'énergie sportive, triple champion d'atterrissage de précision.",
      ru: "Пилот, полный спортивной энергии, 3-кратный чемпион по точности приземления.",
    },
  },
  {
    slug: "tuan-nguyen",
    name: "TUẤN NGUYỄN",
    nickname: {
      vi: "Nhị ca",
      en: "Nhi Ca",
      fr: "Nhi Ca",
      ru: "Ни Ка",
    },
    role: "Phi công PG & PPG",
    experience: "Nhiều năm",
    flights: "3000+",
    hours: "Nhiều giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/tuan-nguyen/tuan-nguyen.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/tuan-nguyen/hero-1.png",
      "/pilots/tuan-nguyen/hero-2.png",
      "/pilots/tuan-nguyen/hero-3.png",
      "/pilots/tuan-nguyen/hero-4.png",
      "/pilots/tuan-nguyen/hero-5.png",
      "/pilots/tuan-nguyen/content-1.png",
      "/pilots/tuan-nguyen/content-2.png",
      "/pilots/tuan-nguyen/content-3.png",
    ],
    specialties: ["Bay êm ái", "Bay với trẻ em", "Đào tạo"],
    certificates: [],
    bio: {
      vi: "Phi công nhẹ nhàng, ân cần, luôn lắng nghe yêu cầu khách. Bạn thích bay mạnh tay hay “chill” nhẹ nhàng, anh đều có cách chọn góc quay và đường bay siêu phê đắm, đảm bảo bay xong ai cũng muốn… làm fan cứng!",
      en: "A gentle, caring pilot who always listens to customer requests. Whether you like acrobatic flying or a gentle 'chill' ride, he has a way of choosing camera angles and flight paths that are super satisfying, ensuring everyone wants to... become a loyal fan after flying!",
      fr: "Un pilote doux et attentionné qui écoute toujours les demandes des clients. Que vous aimiez un vol acrobatique ou une balade 'chill' douce, il a une façon de choisir des angles de caméra et des trajectoires de vol super satisfaisants, garantissant que tout le monde veuille... devenir un fan fidèle après le vol !",
      ru: "Нежный, заботливый пилот, который всегда прислушивается к просьбам клиентов. Нравится ли вам акробатический полет или спокойная 'чилл' прогулка, у него есть способ выбрать ракурсы и траектории полета, которые приносят огромное удовольствие, гарантируя, что каждый захочет... стать преданным фанатом после полета!",
    },
    funFacts: {
      vi: [
        'Biệt danh mang đậm tính kiếm hiệp " Nhị ca" nhưng tính cách anh vô cùng thân thiện và dễ thương. Anh yêu quý các bạn nhỏ và sau mỗi chuyến bay tất cả các chiến thiên thần đều nhớ chú phi công dễ thương và viết thư tặng chú.',
        "Nếu cha mẹ đang tìm một người đàn ông chỉn chu, tận tâm tràn năng lượng tích cực để đồng hành cùng bé yêu trên hành trình chạm mây — thì không ai khác, Nhị ca chính là lựa chọn tuyệt vời!",
      ],
      en: [
        "His nickname 'Nhi Ca' sounds like it's from a martial arts movie, but his personality is extremely friendly and sweet. He loves children, and after every flight, all the little angels remember the sweet pilot and write letters to him.",
        "If parents are looking for a neat, dedicated man with positive energy to accompany their beloved baby on the journey to touch the clouds — then no one else but Nhi Ca is the perfect choice!",
      ],
      fr: [
        "Son surnom 'Nhi Ca' sonne comme s'il sortait d'un film d'arts martiaux, mais sa personnalité est extrêmement amicale et douce. Il adore les enfants, et après chaque vol, tous les petits anges se souviennent du gentil pilote et lui écrivent des lettres.",
        "Si les parents recherchent un homme soigné, dévoué et plein d'énergie positive pour accompagner leur bébé bien-aimé dans son voyage pour toucher les nuages — alors personne d'autre que Nhi Ca n'est le choix parfait !",
      ],
      ru: [
        "Его прозвище 'Ни Ка' звучит, как будто оно из фильма о боевых искусствах, но его характер чрезвычайно дружелюбный и милый. Он обожает детей, и после каждого полета все маленькие ангелы помнят милого пилота и пишут ему письма.",
        "Если родители ищут опрятного, преданного человека с позитивной энергией, чтобы сопровождать их любимого малыша в путешествии к облакам — то никто иной, как Ни Ка, не является идеальным выбором!",
      ],
    },
    achievements: {
      vi: [
        "Đã thực hiện thành công hơn 3.000 chuyến bay tandem an toàn tại Việt Nam.",
        "Hiểu biết sâu về khí tượng tại các điểm bay trên toàn quốc, với khả năng đánh giá và dự báo thời tiết chính xác phục vụ cho hoạt động bay.",
        "Thuần thục kỹ năng bay dù lượn không động cơ và có động cơ.",
        "Là hướng dẫn viên dù lượn chuyên nghiệp, đã đào tạo và đồng hành cùng nhiều phi công trên hành trình chinh phục bầu trời Việt Nam.",
      ],
      en: [
        "Successfully completed over 3,000 safe tandem flights in Vietnam.",
        "Deep understanding of meteorology at flight spots nationwide, with the ability to accurately assess and forecast weather for flight operations.",
        "Proficient in both unpowered and powered paragliding skills.",
        "A professional paragliding instructor, has trained and accompanied many pilots on their journey to conquer the skies of Vietnam.",
      ],
      fr: [
        "A effectué avec succès plus de 3 000 vols en tandem en toute sécurité au Vietnam.",
        "Compréhension approfondie de la météorologie sur les sites de vol à l'échelle nationale, avec la capacité d'évaluer et de prévoir avec précision la météo pour les opérations de vol.",
        "Maîtrise des compétences en parapente non motorisé et motorisé.",
        "Instructeur de parapente professionnel, a formé et accompagné de nombreux pilotes dans leur voyage à la conquête du ciel du Vietnam.",
      ],
      ru: [
        "Успешно выполнил более 3000 безопасных тандемных полетов во Вьетнаме.",
        "Глубокое понимание метеорологии в местах полетов по всей стране, со способностью точно оценивать и прогнозировать погоду для выполнения полетов.",
        "Владеет навыками полетов на безмоторных и моторных парапланах.",
        "Профессиональный инструктор по парапланеризму, обучил и сопровождал многих пилотов в их путешествии по покорению небес Вьетнама.",
      ],
    },
    flyingStyle: {
      vi: "Nhẹ nhàng, ân cần, luôn lắng nghe yêu cầu khách. Bay mạnh hay 'chill' đều được.",
      en: "Gentle, caring, always listens to customer requests. Both strong and 'chill' flights are possible.",
      fr: "Doux, attentionné, écoute toujours les demandes des clients. Les vols forts ou 'chill' sont possibles.",
      ru: "Нежный, заботливый, всегда прислушивается к просьбам клиентов. Возможны как активные, так и 'чилл' полеты.",
    },
  },
  {
    slug: "minh-trung",
    name: "MINH TRUNG",
    nickname: {
      vi: "Chiến thần không gian",
      en: "Space Warrior",
      fr: "Guerrier de l'Espace",
      ru: "Космический Воин",
    },
    role: "Phi công",
    experience: "7 năm",
    flights: "5000+",
    hours: "1000+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/minh-trung/minh-trung.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/minh-trung/hero-1.png",
      "/pilots/minh-trung/hero-2.png",
      "/pilots/minh-trung/hero-3.png",
      "/pilots/minh-trung/hero-4.png",
      "/pilots/minh-trung/hero-5.png",
      "/pilots/minh-trung/content-1.png",
      "/pilots/minh-trung/content-2.png",
      "/pilots/minh-trung/content-3.png",
    ],
    specialties: ["Bay đường trường", "Video TikTok triệu view"],
    certificates: ["Tốt nghiệp An toàn bay tại Nepal"],
    bio: {
      vi: "Hơn 5.000 chuyến bay đôi, 7 năm bám dây lơ lửng trên trời, hơn 1.000 giờ “tán mây, thả gió”. Bí danh Trung Chocolate – bay cùng anh, bạn sẽ được chém gió vui hết nấc, cười mỏi miệng!",
      en: "Over 5,000 tandem flights, 7 years hanging in the sky, over 1,000 hours 'chatting with clouds, playing with the wind'. Alias Trung Chocolate – fly with him, you'll have endless fun and laugh your head off!",
      fr: "Plus de 5 000 vols en tandem, 7 ans suspendu dans le ciel, plus de 1 000 heures à 'discuter avec les nuages, jouer avec le vent'. Alias Trung Chocolate – volez avec lui, vous vous amuserez sans fin et rirez aux éclats !",
      ru: "Более 5000 тандемных полетов, 7 лет в небе, более 1000 часов 'общения с облаками, игры с ветром'. Псевдоним Trung Chocolate – летите с ним, вас ждет бесконечное веселье и смех до упада!",
    },
    funFacts: {
      vi: [
        "Cánh dù anh đang bay là cờ đỏ sao vàng rực rỡ — bay là truyền cảm hứng yêu nước, yêu trời, yêu luôn cả cuộc đời.",
        "Bay cùng anh, clip để lên triệu view TikTok, ảnh và video thì “xịn xò” khỏi chỉnh, đủ làm crush cũng phải lỡ nhịp tim.",
        "Tính cách thì hoà đồng, vui vẻ, bảo đảm bạn vừa bay vừa cười toe toét, quên luôn cả sợ độ cao.",
        "Nhược điểm duy nhất? Nắng làm đen da, mưa làm tóc xù — nhưng thần thái vẫn đỉnh, nụ cười thì không chỗ nào chê!",
      ],
      en: [
        "The canopy he flies is a vibrant red flag with a yellow star — flying is inspiring patriotism, love for the sky, and love for life itself.",
        "Fly with him, and your clips will get millions of TikTok views, photos and videos are 'top-notch' without any editing, enough to make even your crush's heart skip a beat.",
        "His personality is sociable and cheerful, guaranteed to make you smile from ear to ear, forgetting all about your fear of heights.",
        "The only drawback? The sun darkens the skin, the rain frizzes the hair — but the charisma is still top-notch, and the smile is flawless!",
      ],
      fr: [
        "La voile qu'il pilote est un drapeau rouge vibrant avec une étoile jaune - voler inspire le patriotisme, l'amour du ciel et l'amour de la vie elle-même.",
        "Volez avec lui, et vos clips obtiendront des millions de vues TikTok, les photos et vidéos sont 'haut de gamme' sans aucune retouche, de quoi faire battre le cœur de votre béguin.",
        "Sa personnalité est sociable et joyeuse, garantie de vous faire sourire d'une oreille à l'autre, vous faisant oublier votre peur du vide.",
        "Le seul inconvénient ? Le soleil fonce la peau, la pluie frise les cheveux - mais le charisme est toujours au top, et le sourire est impeccable !",
      ],
      ru: [
        "Купол, на котором он летает, — это яркий красный флаг с желтой звездой — полет вдохновляет на патриотизм, любовь к небу и любовь к самой жизни.",
        "Летайте с ним, и ваши клипы наберут миллионы просмотров в TikTok, фотографии и видео будут 'высшего качества' без всякого редактирования, достаточного, чтобы заставить сердце вашего возлюбленного биться чаще.",
        "Его характер общительный и веселый, гарантированно заставит вас улыбаться до ушей, забыв о страхе высоты.",
        "Единственный недостаток? Солнце делает кожу темнее, дождь завивает волосы — но харизма всегда на высоте, а улыбка безупречна!",
      ],
    },
    achievements: {
      vi: [
        "Hơn 5.000 chuyến bay đôi an toàn với hành khách",
        "7 năm kinh nghiệm bay dù lượn, chuyên sâu trong lĩnh vực bay đôi và bay đường trường",
        "Tích lũy hơn 1.000 giờ bay thực tế, làm chủ nhiều điều kiện thời tiết và địa hình phức tạp",
        "Tốt nghiệp khóa huấn luyện An toàn bay tại Nepal, quốc gia có điều kiện bay khắt khe và tiêu chuẩn quốc tế cao",
      ],
      en: [
        "Over 5,000 safe tandem flights with passengers.",
        "7 years of paragliding experience, specializing in tandem and cross-country flying.",
        "Accumulated over 1,000 hours of actual flight time, mastering many complex weather conditions and terrains.",
        "Graduated from a Flight Safety training course in Nepal, a country with strict flying conditions and high international standards.",
      ],
      fr: [
        "Plus de 5 000 vols en tandem en toute sécurité avec des passagers.",
        "7 ans d'expérience en parapente, spécialisé dans le vol en tandem et le vol de distance.",
        "Accumulé plus de 1 000 heures de vol effectif, maîtrisant de nombreuses conditions météorologiques et terrains complexes.",
        "Diplômé d'un cours de formation à la sécurité des vols au Népal, un pays aux conditions de vol strictes et aux normes internationales élevées.",
      ],
      ru: [
        "Более 5000 безопасных тандемных полетов с пассажирами.",
        "7-летний опыт полетов на параплане, специализация на тандемных и маршрутных полетах.",
        "Накоплено более 1000 часов реального налета, освоены многие сложные погодные условия и рельефы.",
        "Окончил учебный курс по безопасности полетов в Непале, стране со строгими условиями полетов и высокими международными стандартами.",
      ],
    },
    flyingStyle: {
      vi: "Bay vui hết nấc, clip triệu view, chuyên bay đường trường.",
      en: "Fly with endless fun, million-view clips, specializing in cross-country flying.",
      fr: "Volez avec un plaisir sans fin, des clips à un million de vues, spécialisé dans le vol de distance.",
      ru: "Полеты с бесконечным весельем, клипы с миллионами просмотров, специализация на маршрутных полетах.",
    },
  },
  {
    slug: "phan-hung",
    name: "PHAN HÙNG",
    nickname: {
      vi: "Lãng khách bầu trời",
      en: "Sky Wanderer",
      fr: "Vagabond du Ciel",
      ru: "Небесный Странник",
    },
    role: "Phi công",
    experience: "Từ 2018",
    flights: "3000+",
    hours: "Nhiều giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/phan-hung/phan-hung.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/phan-hung/hero-1.png",
      "/pilots/phan-hung/hero-2.png",
      "/pilots/phan-hung/hero-3.png",
      "/pilots/phan-hung/hero-4.png",
      "/pilots/phan-hung/hero-5.png",
      "/pilots/phan-hung/content-1.png",
      "/pilots/phan-hung/content-2.png",
      "/pilots/phan-hung/content-3.png",
    ],
    specialties: ["Góc quay nghệ thuật", "Clip triệu view"],
    certificates: ["Huấn luyện chuẩn quốc tế"],
    bio: {
      vi: "Bay cùng anh, bạn sẽ có clip triệu view triệu like với góc quay siêu nghệ thuật. Trải nghiệm an toàn tuyệt đối và khoảnh khắc bầu trời tuyệt đẹp được lưu giữ, mang về những tư liệu quý giá khó quên trên từng chuyến bay đôi.",
      en: "Fly with him, and you'll get million-view, million-like clips with super artistic camera angles. An absolutely safe experience and beautiful sky moments are captured, bringing back precious, unforgettable materials from every tandem flight.",
      fr: "Volez avec lui, et vous obtiendrez des clips à un million de vues et un million de 'j'aime' avec des angles de caméra super artistiques. Une expérience absolument sûre et de beaux moments dans le ciel sont capturés, rapportant des matériaux précieux et inoubliables de chaque vol en tandem.",
      ru: "Летайте с ним, и вы получите клипы с миллионами просмотров и лайков с супер-художественными ракурсами. Абсолютно безопасный опыт и запечатленные прекрасные моменты в небе, приносящие драгоценные, незабываемые материалы с каждого тандемного полета.",
    },
    funFacts: {
      vi: [
        "Gặp Phan Hùng – “rocker” của bầu trời, tóc dài bay trong gió như chính đôi cánh dù lượn.",
        "Bay cùng anh, bạn không chỉ có clip triệu view mà còn triệu cảm xúc.",
        "Hơn 1000 chuyến bay – mỗi chuyến là một câu chuyện, là khoảnh khắc để đời.",
        "Giàu năng lượng, am hiểu địa hình, đam mê “cháy” – sẵn sàng đưa bạn chạm mây!",
      ],
      en: [
        "Meet Phan Hung – the 'rocker' of the sky, with long hair flowing in the wind just like his paraglider wing.",
        "Fly with him, you not only get million-view clips but also a million emotions.",
        "Over 3000 flights – each one a story, a moment to remember for a lifetime.",
        "Full of energy, understands the terrain, 'burning' passion – ready to take you to the clouds!",
      ],
      fr: [
        "Rencontrez Phan Hung – le 'rockeur' du ciel, avec des cheveux longs flottant au vent tout comme son aile de parapente.",
        "Volez avec lui, vous n'obtenez pas seulement des clips à un million de vues, mais aussi un million d'émotions.",
        "Plus de 3000 vols – chacun est une histoire, un moment à retenir pour la vie.",
        "Plein d'énergie, comprend le terrain, passion 'brûlante' – prêt à vous emmener dans les nuages !",
      ],
      ru: [
        "Встречайте Фан Хунга – 'рокера' неба, с длинными волосами, развевающимися на ветру, как крыло его параплана.",
        "Летая с ним, вы получаете не только клипы с миллионами просмотров, но и миллион эмоций.",
        "Более 3000 полетов – каждый из них - это история, момент, который запомнится на всю жизнь.",
        "Полон энергии, понимает местность, 'горящая' страсть – готов поднять вас к облакам!",
      ],
    },
    achievements: {
      vi: [
        "Phan Hùng bắt đầu theo đuổi đam mê dù lượn từ năm 2018 và đã có nhiều năm kinh nghiệm bay chuyên nghiệp tại Việt Nam.",
        "Anh am hiểu sâu sắc về khí tượng và địa hình tại các điểm bay trên khắp cả nước, là yếu tố quan trọng đảm bảo mỗi chuyến bay đều an toàn và tối ưu trải nghiệm.",
        "Đã thực hiện hơn 3000 chuyến bay đôi chuyên nghiệp tại Việt Nam",
        "Liên tục tham gia các khoá học đào tạo, huấn luyện theo chuẩn quốc tế về dù lượn",
      ],
      en: [
        "Phan Hung started pursuing his passion for paragliding in 2018 and has many years of professional flying experience in Vietnam.",
        "He has a deep understanding of meteorology and terrain at flight spots across the country, which is a crucial factor in ensuring every flight is safe and optimizes the experience.",
        "Completed over 3000 professional tandem flights in Vietnam.",
        "Continuously participates in training courses according to international paragliding standards.",
      ],
      fr: [
        "Phan Hung a commencé à poursuivre sa passion pour le parapente en 2018 et a de nombreuses années d'expérience de vol professionnel au Vietnam.",
        "Il a une profonde compréhension de la météorologie et du terrain sur les sites de vol à travers le pays, ce qui est un facteur crucial pour garantir que chaque vol soit sûr et optimise l'expérience.",
        "A effectué plus de 3000 vols en tandem professionnels au Vietnam.",
        "Participe continuellement à des cours de formation selon les normes internationales de parapente.",
      ],
      ru: [
        "Фан Хунг начал увлекаться парапланеризмом в 2018 году и имеет многолетний опыт профессиональных полетов во Вьетнаме.",
        "Он обладает глубоким пониманием метеорологии и рельефа в местах полетов по всей стране, что является решающим фактором в обеспечении безопасности каждого полета и оптимизации опыта.",
        "Выполнил более 3000 профессиональных тандемных полетов во Вьетнаме.",
        "Постоянно участвует в учебных курсах по международным стандартам парапланеризма.",
      ],
    },
    flyingStyle: {
      vi: "Góc quay siêu nghệ thuật, clip triệu view, trải nghiệm an toàn tuyệt đối.",
      en: "Super artistic camera angles, million-view clips, absolutely safe experience.",
      fr: "Angles de caméra super artistiques, clips à un million de vues, expérience absolument sûre.",
      ru: "Супер-художественные ракурсы, клипы с миллионами просмотров, абсолютно безопасный опыт.",
    },
  },
  {
    slug: "ngo-doi",
    name: "NGÔ VĂN ĐỘI",
    nickname: {
      vi: "Chiến binh lượn lách",
      en: "Maneuver Warrior",
      fr: "Guerrier de la Manœuvre",
      ru: "Воин Маневра",
    },
    role: "Phi công",
    experience: "5 năm",
    flights: "1500+",
    hours: "500+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/ngo-doi/ngo-doi.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/ngo-doi/hero-1.png",
      "/pilots/ngo-doi/hero-2.png",
      "/pilots/ngo-doi/hero-3.png",
      "/pilots/ngo-doi/hero-4.png",
      "/pilots/ngo-doi/hero-5.png",
      "/pilots/ngo-doi/content-1.png",
      "/pilots/ngo-doi/content-2.png",
      "/pilots/ngo-doi/content-3.png",
    ],
    specialties: ["Bay phấn khích", "Vui vẻ", "An toàn"],
    certificates: ["Kỷ lục bay 7 giờ liên tục tại Đồi Bù"],
    bio: {
      vi: "Tham gia mọi giải đấu dù lượn tại Việt Nam, giữ kỷ lục 7 giờ bay liên tục tại Đồi Bù – Chương Mỹ. Anh đam mê dù lượn, mang đến cho khách hàng trải nghiệm bay đầy phấn khích, an toàn và ngập tràn tiếng cười.",
      en: "Participates in every paragliding competition in Vietnam, holds the record for 7 consecutive hours of flying at Doi Bu - Chuong My. He is passionate about paragliding, bringing customers an exciting, safe, and laughter-filled flying experience.",
      fr: "Participe à toutes les compétitions de parapente au Vietnam, détient le record de 7 heures de vol consécutives à Doi Bu - Chuong My. Il est passionné de parapente, offrant aux clients une expérience de vol excitante, sûre et remplie de rires.",
      ru: "Участвует во всех соревнованиях по парапланеризму во Вьетнаме, держит рекорд 7 часов непрерывного полета в Дой Бу - Чыонг Ми. Он увлечен парапланеризмом, даря клиентам захватывающий, безопасный и полный смеха опыт полета.",
    },
    funFacts: {
      vi: [
        "Chàng trai trẻ mang gió vào… nụ cười, bay cao chẳng cần “đi thang máy”!",
        "Đam mê dù lượn cháy bỏng — mỗi chuyến bay là một trái tim “cất cánh”",
        "Bay cùng anh, bạn sẽ cảm nhận niềm vui trên cao — gió lùa mạnh như đang vỗ tay cổ vũ bạn.",
        "Người bạn đồng hành siêu tận tâm, sẵn sàng biến giấc mơ bay lơ lửng thành chuyến phiêu lưu kỳ thú",
      ],
      en: [
        "The young man who brings the wind into... his smile, flying high without needing an 'elevator'!",
        "A burning passion for paragliding — every flight is a heart 'taking off'.",
        "Flying with him, you'll feel the joy up high — the wind rushes strong as if clapping to cheer you on.",
        "A super dedicated companion, ready to turn the dream of floating into a thrilling adventure.",
      ],
      fr: [
        "Le jeune homme qui amène le vent dans... son sourire, volant haut sans avoir besoin d'un 'ascenseur' !",
        "Une passion brûlante pour le parapente — chaque vol est un cœur qui 'décolle'.",
        "En volant avec lui, vous ressentirez la joie en altitude — le vent souffle fort comme s'il vous applaudissait.",
        "Un compagnon super dévoué, prêt à transformer le rêve de flotter en une aventure palpitante.",
      ],
      ru: [
        "Молодой человек, который приносит ветер в... свою улыбку, летая высоко без 'лифта'!",
        "Пылающая страсть к парапланеризму — каждый полет - это 'взлетающее' сердце.",
        "Летая с ним, вы почувствуете радость на высоте — ветер дует сильно, словно аплодируя вам.",
        "Супер-преданный компаньон, готовый превратить мечту о полете в захватывающее приключение.",
      ],
    },
    achievements: {
      vi: [
        "Từ năm 2023 đến 2025, anh đã thực hiện hơn 1500 chuyến bay đơn và bay đôi tại hầu hết các điểm bay nổi tiếng trên khắp Việt Nam.",
        "Tích lũy hơn 500 giờ bay thực tế, cùng với 5 năm kinh nghiệm vững chắc trong lĩnh vực dù lượn.",
        "Gương mặt quen thuộc tại tất cả các giải đấu dù lượn từ Nam ra Bắc, luôn góp mặt với tinh thần thi đấu chuyên nghiệp và niềm đam mê mạnh liệt.",
        "Lập kỷ lục bay liên tục 7 tiếng tại Chương Mỹ – Đồi Bù, đánh dấu một cột mốc quan trọng trong sự nghiệp bay của mình.",
      ],
      en: [
        "From 2023 to 2025, he completed over 1500 solo and tandem flights at most famous flight spots across Vietnam.",
        "Accumulated over 500 hours of actual flight time, along with 5 years of solid experience in paragliding.",
        "A familiar face at all paragliding competitions from North to South, always participating with a professional competitive spirit and intense passion.",
        "Set a record for 7 consecutive hours of flying at Chuong My - Doi Bu, marking an important milestone in his flying career.",
      ],
      fr: [
        "De 2023 à 2025, il a effectué plus de 1500 vols solo et tandem sur la plupart des sites de vol célèbres à travers le Vietnam.",
        "Accumulé plus de 500 heures de vol effectif, ainsi que 5 ans d'expérience solide en parapente.",
        "Un visage familier à toutes les compétitions de parapente du Nord au Sud, participant toujours avec un esprit de compétition professionnel et une passion intense.",
        "A établi un record de 7 heures de vol consécutives à Chuong My - Doi Bu, marquant une étape importante dans sa carrière de pilote.",
      ],
      ru: [
        "С 2023 по 2025 год он выполнил более 1500 одиночных и тандемных полетов в самых известных летных местах по всему Вьетнаму.",
        "Накопил более 500 часов реального налета, а также 5-летний солидный опыт в парапланеризме.",
        "Знакомое лицо на всех соревнованиях по парапланеризму с Севера на Юг, всегда участвуя с профессиональным соревновательным духом и сильной страстью.",
        "Установил рекорд 7 часов непрерывного полета в Чыонг Ми - Дой Бу, отметив важную веху в своей летной карьере.",
      ],
    },
    flyingStyle: {
      vi: "Trải nghiệm bay đầy phấn khích, an toàn và ngập tràn tiếng cười.",
      en: "An exciting, safe, and laughter-filled flying experience.",
      fr: "Une expérience de vol excitante, sûre et remplie de rires.",
      ru: "Захватывающий, безопасный и полный смеха опыт полета.",
    },
  },
  {
    slug: "minh-vo",
    name: "MINH VÕ",
    nickname: {
      vi: "Đại bàng thép",
      en: "Steel Eagle",
      fr: "Aigle d'Acier",
      ru: "Стальной Орел",
    },
    role: "Phi công",
    experience: "14 năm",
    flights: "5000+",
    hours: "Nhiều giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/minh-vo/minh-vo.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/minh-vo/hero-1.png",
      "/pilots/minh-vo/hero-2.png",
      "/pilots/minh-vo/hero-3.png",
      "/pilots/minh-vo/hero-4.png",
      "/pilots/minh-vo/hero-5.png",
      "/pilots/minh-vo/content-1.png",
      "/pilots/minh-vo/content-2.png",
      "/pilots/minh-vo/content-3.png",
    ],
    specialties: ["Phi công kỳ cựu", "Truyền lửa đam mê"],
    certificates: ["Top 5 phi công đời đầu", "Giải Nhất Hạ Cánh Chính Xác MCC 2023"],
    bio: {
      vi: "Bay cùng “phi công triệu like” với 14 năm kinh nghiệm. Đam mê bầu trời từ nhỏ, anh truyền lửa qua từng chuyến bay đôi, mang đến trải nghiệm tuyệt đỉnh và khoảnh khắc đáng nhớ cho mọi khách hàng.",
      en: "Fly with the 'million-like pilot' with 14 years of experience. Passionate about the sky since childhood, he spreads his enthusiasm through every tandem flight, delivering a supreme experience and memorable moments for every customer.",
      fr: "Volez avec le 'pilote à un million de j'aime' avec 14 ans d'expérience. Passionné par le ciel depuis l'enfance, il transmet son enthousiasme à travers chaque vol en tandem, offrant une expérience suprême et des moments mémorables à chaque client.",
      ru: "Летайте с 'пилотом-миллионником' с 14-летним опытом. Увлеченный небом с детства, он передает свой энтузиазм через каждый тандемный полет, даря незабываемые впечатления и памятные моменты каждому клиенту.",
    },
    funFacts: {
      vi: [
        "Minh Võ – “phi công triệu like” với niềm đam mê bầu trời từ bé, lớn lên chỉ thích trò chuyện với mây và chơi đùa với gió. Bay cùng anh không chỉ là lên cao, mà còn lên tâm trạng, view đẹp, và tiếng cười rộn ràng suốt chuyến đi. Anh truyền lửa như tênh mà chất lừ, khiến bay xong cũng chỉ muốn… bay thêm lần nữa cho đã!",
      ],
      en: [
        "Minh Vo – the 'million-like pilot' with a childhood passion for the sky, grew up loving to chat with the clouds and play with the wind. Flying with him is not just about going high, but also about high spirits, beautiful views, and resounding laughter throughout the trip. He spreads his passion so coolly and charmingly that after flying, you just want to... fly again to get enough!",
      ],
      fr: [
        "Minh Vo – le 'pilote à un million de j'aime' avec une passion d'enfance pour le ciel, a grandi en aimant discuter avec les nuages et jouer avec le vent. Voler avec lui, ce n'est pas seulement monter haut, c'est aussi un moral au beau fixe, des vues magnifiques et des rires retentissants tout au long du voyage. Il transmet sa passion avec tant de classe et de charme qu'après avoir volé, vous avez juste envie de... revoler pour en avoir assez !",
      ],
      ru: [
        "Минь Во – 'пилот-миллионник' с детской страстью к небу, выросший в любви к общению с облаками и играм с ветром. Полет с ним - это не просто подъем на высоту, это еще и отличное настроение, прекрасные виды и громкий смех на протяжении всей поездки. Он так круто и очаровательно заражает своей страстью, что после полета хочется... полететь еще раз, чтобы насладиться вдоволь!",
      ],
    },
    achievements: {
      vi: [
        "Với 14 năm kinh nghiệm bay dù lượn và hơn 2.000 chuyến bay đôi an toàn, anh là một trong những phi công kỳ cựu và đáng tin cậy hàng đầu tại Việt Nam.",
        "Là một trong Top 5 phi công đời đầu, anh đã góp phần đặt nền móng cho cộng đồng dù lượn trong nước.",
        "Năm 2023, anh cùng đồng đội xuất sắc giành giải Nhất nội dung Hạ Cánh Chính Xác tại giải đấu MCC, khẳng định kỹ năng chuyên môn và bản lĩnh thi đấu vững vàng.",
      ],
      en: [
        "With 14 years of paragliding experience and over 5,000 safe tandem flights, he is one of the top veteran and reliable pilots in Vietnam.",
        "As one of the Top 5 first-generation pilots, he helped lay the foundation for the paragliding community in the country.",
        "In 2023, he and his teammates excellently won First Prize in the Precision Landing category at the MCC competition, affirming his professional skills and strong competitive spirit.",
      ],
      fr: [
        "Avec 14 ans d'expérience en parapente et plus de 5 000 vols en tandem en toute sécurité, il est l'un des pilotes vétérans et fiables les plus importants au Vietnam.",
        "En tant que l'un des 5 meilleurs pilotes de la première génération, il a contribué à jeter les bases de la communauté du parapente dans le pays.",
        "En 2023, lui et ses coéquipiers ont brillamment remporté le premier prix dans la catégorie Atterrissage de Précision à la compétition MCC, affirmant ses compétences professionnelles et son fort esprit de compétition.",
      ],
      ru: [
        "С 14-летним опытом полетов на параплане и более 5000 безопасных тандемных полетов, он является одним из ведущих ветеранов и надежных пилотов во Вьетнаме.",
        "Будучи одним из 5 лучших пилотов первого поколения, он помог заложить основы парапланерного сообщества в стране.",
        "В 2023 году он и его товарищи по команде блестяще заняли первое место в категории 'Точность приземления' на соревновании MCC, подтвердив свои профессиональные навыки и сильный соревновательный дух.",
      ],
    },
    flyingStyle: {
      vi: "Phi công kỳ cựu, truyền lửa đam mê, mang đến trải nghiệm tuyệt đỉnh.",
      en: "Veteran pilot, spreads passion, delivers a supreme experience.",
      fr: "Pilote vétéran, transmet la passion, offre une expérience suprême.",
      ru: "Опытный пилот, заражает страстью, дарит незабываемые впечатления.",
    },
  },
  {
    slug: "toan-nguyen",
    name: "TOÀN NGUYỄN",
    nickname: {
      vi: "Rambo",
      en: "Rambo",
      fr: "Rambo",
      ru: "Рэмбо",
    },
    role: "Phi công",
    experience: "10+ năm",
    flights: "5000-", // (Gần 5000)
    hours: "Nhiều giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/toan-nguyen/toan-nguyen.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/toan-nguyen/hero-1.png",
      "/pilots/toan-nguyen/hero-2.png",
      "/pilots/toan-nguyen/hero-3.png",
      "/pilots/toan-nguyen/hero-4.png",
      "/pilots/toan-nguyen/hero-5.png",
      "/pilots/toan-nguyen/content-1.png",
      "/pilots/toan-nguyen/content-2.png",
      "/pilots/toan-nguyen/content-3.png",
    ],
    specialties: ["Bay nhiều điểm", "Vui vẻ"],
    certificates: ["Tốt nghiệp an toàn bay chuẩn quốc tế"],
    bio: {
      vi: "Hơn 10 năm cày gió cưỡi mây, gần 5000 chuyến bay. Bay khắp Việt Nam: Kon Tum, Lý Sơn, Điện Biên.. GPS còn chưa kịp load, anh đã đặt chân tới! Dù lượn với anh không chỉ là đam mê – là phong cách sống trên mây.",
      en: "Over 10 years of riding the wind and clouds, nearly 5000 flights. Flew all over Vietnam: Kon Tum, Ly Son, Dien Bien... Before the GPS could even load, he was there! Paragliding for him is not just a passion – it's a lifestyle in the clouds.",
      fr: "Plus de 10 ans à chevaucher le vent et les nuages, près de 5000 vols. A volé partout au Vietnam : Kon Tum, Ly Son, Dien Bien... Avant même que le GPS ne puisse se charger, il y était ! Le parapente pour lui n'est pas seulement une passion – c'est un style de vie dans les nuages.",
      ru: "Более 10 лет, покоряя ветер и облака, почти 5000 полетов. Летал по всему Вьетнаму: Контум, Лишон, Дьенбьен... GPS еще не успевал загрузиться, а он уже был там! Парапланеризм для него не просто страсть – это стиль жизни в облаках.",
    },
    funFacts: {
      vi: [
        "Bay cùng Toàn Nguyễn – “Rambo” trên trời, bạn không chỉ được “cưỡi mây” mà còn được… cười mỏi miệng!",
        "Anh ấy bay như gió, nói như gió, mang lại cảm giác vừa an toàn vừa vui không tưởng. Bay xong chắc chắn bạn sẽ muốn gọi anh ấy làm “phi công ruột” cho mọi chuyến đi. Đảm bảo một điều: lên cùng Toàn, xuống không muốn rời!",
      ],
      en: [
        "Fly with Toan Nguyen – the 'Rambo' of the sky, you not only get to 'ride the clouds' but also... laugh your head off!",
        "He flies like the wind, talks like the wind, bringing a feeling of both safety and incredible fun. After flying, you'll definitely want to make him your 'go-to pilot' for every trip. One thing is guaranteed: once you go up with Toan, you won't want to come down!",
      ],
      fr: [
        "Volez avec Toan Nguyen – le 'Rambo' du ciel, vous n'allez pas seulement 'chevaucher les nuages' mais aussi... rire aux éclats !",
        "Il vole comme le vent, parle comme le vent, apportant un sentiment à la fois de sécurité et de plaisir incroyable. Après avoir volé, vous voudrez certainement faire de lui votre 'pilote préféré' pour chaque voyage. Une chose est garantie : une fois que vous montez avec Toan, vous ne voudrez plus descendre !",
      ],
      ru: [
        "Летайте с Тоан Нгуеном – 'Рэмбо' неба, вы не только 'покатаетесь на облаках', но и... насмеетесь до упада!",
        "Он летает как ветер, говорит как ветер, принося ощущение безопасности и невероятного веселья. После полета вы обязательно захотите сделать его своим 'любимым пилотом' для каждой поездки. Одно гарантировано: поднявшись с Тоаном, вы не захотите спускаться!",
      ],
    },
    achievements: {
      vi: [
        "Với hơn 10 năm kinh nghiệm chinh phục bầu trời, gần 5.000 chuyến bay đơn và đôi, anh là một trong những phi công giàu trải nghiệm và đáng tin cậy tại Việt Nam.",
        "Tốt nghiệp khóa huấn luyện an toàn bay đạt tiêu chuẩn quốc tế",
        "Đã từng bay qua hầu hết các điểm dù lượn nổi tiếng tại Việt Nam như Kon Tum, Đắk Nông, Nha Trang, Lý Sơn, Điện Biên Phủ",
        "Thường xuyên tham gia các giải thi đấu hạ cánh chính xác tại các địa danh như Hà Nội, Mù Cang Chải, Đà Nẵng, khẳng định kỹ năng và bản lĩnh thi đấu ổn định.",
      ],
      en: [
        "With over 10 years of experience conquering the sky, nearly 5,000 solo and tandem flights, he is one of the most experienced and reliable pilots in Vietnam.",
        "Graduated from an international standard flight safety training course.",
        "Has flown at most famous paragliding spots in Vietnam such as Kon Tum, Dak Nong, Nha Trang, Ly Son, Dien Bien Phu.",
        "Regularly participates in precision landing competitions in locations such as Hanoi, Mu Cang Chai, Da Nang, affirming his stable skills and competitive spirit.",
      ],
      fr: [
        "Avec plus de 10 ans d'expérience à conquérir le ciel, près de 5 000 vols solo et tandem, il est l'un des pilotes les plus expérimentés et fiables au Vietnam.",
        "Diplômé d'un cours de formation à la sécurité des vols aux normes internationales.",
        "A volé sur la plupart des sites de parapente célèbres au Vietnam tels que Kon Tum, Dak Nong, Nha Trang, Ly Son, Dien Bien Phu.",
        "Participe régulièrement à des compétitions d'atterrissage de précision dans des endroits tels que Hanoï, Mu Cang Chai, Da Nang, affirmant ses compétences stables et son esprit de compétition.",
      ],
      ru: [
        "С более чем 10-летним опытом покорения неба, почти 5000 одиночных и тандемных полетов, он является одним из самых опытных и надежных пилотов во Вьетнаме.",
        "Окончил курс обучения по безопасности полетов по международным стандартам.",
        "Летал в большинстве известных мест для парапланеризма во Вьетнаме, таких как Контум, Дакнонг, Нячанг, Лишон, Дьенбьенфу.",
        "Регулярно участвует в соревнованиях по точности приземления в таких местах, как Ханой, Му Канг Чай, Дананг, подтверждая свои стабильные навыки и соревновательный дух.",
      ],
    },
    flyingStyle: {
      vi: "Phong cách sống trên mây, bay như gió, nói như gió, an toàn và vui không tưởng.",
      en: "A lifestyle in the clouds, flies like the wind, talks like the wind, safe and incredibly fun.",
      fr: "Un style de vie dans les nuages, vole comme le vent, parle comme le vent, sûr et incroyablement amusant.",
      ru: "Стиль жизни в облаках, летает как ветер, говорит как ветер, безопасно и невероятно весело.",
    },
  },
  {
    slug: "chien-thang",
    name: "CHIẾN THẮNG",
    nickname: {
      vi: "Thắng thần sét",
      en: "Lightning Victor",
      fr: "Victor Foudroyant",
      ru: "Победитель-Молния",
    },
    role: "Phi công PG & PPG",
    experience: "7 năm",
    flights: "4000+",
    hours: "1000+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/chien-thang/chien-thang.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/chien-thang/hero-1.png",
      "/pilots/chien-thang/hero-2.png",
      "/pilots/chien-thang/hero-3.png",
      "/pilots/chien-thang/hero-4.png",
      "/pilots/chien-thang/hero-5.png",
      "/pilots/chien-thang/content-1.png",
      "/pilots/chien-thang/content-2.png",
      "/pilots/chien-thang/content-3.png",
    ],
    specialties: ["Bay an toàn", "Vui vẻ"],
    certificates: ["Kỷ lục Việt Nam #2 bay đơn 9.5 tiếng"],
    bio: {
      vi: "Anh có 7 năm sống cùng mây gió, hơn 4.000 chuyến bay đôi an toàn, 1.000+ giờ lơ lửng trên trời. Anh từng giữ kỷ lục bay đơn 9 tiếng rưỡi tại Việt Nam! “Càn quét” các giải đấu dù lượn từ Bắc chí Nam, phong độ luôn ở đỉnh cao.",
      en: "He has 7 years of living with the clouds and wind, over 4,000 safe tandem flights, 1,000+ hours floating in the sky. He once held the record for a 9.5-hour solo flight in Vietnam! 'Sweeping' paragliding competitions from North to South, his form is always at its peak.",
      fr: "Il a 7 ans de vie avec les nuages et le vent, plus de 4 000 vols en tandem en toute sécurité, 1 000+ heures à flotter dans le ciel. Il a déjà détenu le record d'un vol solo de 9,5 heures au Vietnam ! 'Balayant' les compétitions de parapente du Nord au Sud, sa forme est toujours au sommet.",
      ru: "Он 7 лет живет с облаками и ветром, у него более 4=000 безопасных тандемных полетов, 1000+ часов в небе. Он однажды установил рекорд Вьетнама по одиночному полету - 9,5 часов! 'Сметая' соревнования по парапланеризму с Севера на Юг, его форма всегда на пике.",
    },
    funFacts: {
      vi: [
        "Chiến Thắng – “Thắng thần sét”, bay nhanh như tia chớp mà vẫn khiến bạn yên tâm tuyệt đối.",
        "Lơ lửng trên trời cùng anh, bạn sẽ cười tít mắt vì vui nhưng vẫn muốn xuống.",
        "Bay với anh không chỉ là trải nghiệm mà còn là chuyến phiêu lưu tràn ngập tiếng cười.",
        "Bay lâu đến mức mây cũng phải than phục: “Này, anh còn không thấy à?”",
      ],
      en: [
        "Chien Thang – 'Lightning Victor', flies as fast as lightning but still makes you feel completely at ease.",
        "Floating in the sky with him, you'll be grinning with joy but still want to come down.",
        "Flying with him is not just an experience but an adventure full of laughter.",
        "Flies so long that even the clouds have to admire: 'Hey, aren't you tired?'",
      ],
      fr: [
        "Chien Thang – 'Victor Foudroyant', vole aussi vite que l'éclair mais vous fait toujours sentir complètement à l'aise.",
        "Flottant dans le ciel avec lui, vous sourirez de joie mais voudrez quand même descendre.",
        "Voler avec lui n'est pas seulement une expérience, c'est une aventure pleine de rires.",
        "Vole si longtemps que même les nuages doivent admirer : 'Hé, tu n'es pas fatigué ?'",
      ],
      ru: [
        "Чиен Тханг – 'Победитель-Молния', летает быстро, как молния, но все равно заставляет вас чувствовать себя в полной безопасности.",
        "Паря в небе с ним, вы будете улыбаться от радости, но все равно захотите спуститься.",
        "Полет с ним - это не просто опыт, а приключение, полное смеха.",
        "Летает так долго, что даже облака восхищаются: 'Эй, ты не устал?'",
      ],
    },
    achievements: {
      vi: [
        "Với 7 năm kinh nghiệm làm bạn cùng trời mây, anh đã thực hiện hơn 4.000 chuyến bay đôi an toàn và chuyên nghiệp.",
        "Anh giữ kỷ lục Việt Nam #2 về thời gian bay đơn lâu nhất với 9 tiếng rưỡi liên tục, khẳng định sự bền bỉ và kỹ năng bay xuất sắc.",
        "Am hiểu sâu sắc về kỹ thuật dù lượn và điều kiện thời tiết, đảm bảo trải nghiệm an toàn và tuyệt vời cho khách hàng.",
      ],
      en: [
        "With 7 years of experience befriending the sky, he has completed over 4,000 safe and professional tandem flights.",
        "He holds the #2 record in Vietnam for the longest solo flight at 9.5 consecutive hours, affirming his endurance and excellent flying skills.",
        "Deep understanding of paragliding techniques and weather conditions, ensuring a safe and wonderful experience for customers.",
      ],
      fr: [
        "Avec 7 ans d'expérience à se lier d'amitié avec le ciel, il a effectué plus de 4 000 vols en tandem sûrs et professionnels.",
        "Il détient le record n°2 au Vietnam du plus long vol solo avec 9,5 heures consécutives, affirmant son endurance et ses excellentes compétences de vol.",
        "Compréhension approfondie des techniques de parapente et des conditions météorologiques, garantissant une expérience sûre et merveilleuse aux clients.",
      ],
      ru: [
        "Имея 7-летний опыт дружбы с небом, он выполнил более 4000 безопасных и профессиональных тандемных полетов.",
        "Он удерживает 2-й рекорд Вьетнама по самому длительному одиночному полету - 9,5 часов подряд, подтверждая свою выносливость и отличные летные навыки.",
        "Глубокое понимание техник парапланеризма и погодных условий, обеспечивающее безопасный и прекрасный опыт для клиентов.",
      ],
    },
    flyingStyle: {
      vi: "Bay nhanh như tia chớp nhưng vẫn yên tâm tuyệt đối, chuyến phiêu lưu tràn ngập tiếng cười.",
      en: "Flies as fast as lightning but still completely reassuring, an adventure full of laughter.",
      fr: "Vole aussi vite que l'éclair mais reste totalement rassurant, une aventure pleine de rires.",
      ru: "Летает быстро, как молния, но при этом абсолютно спокоен, приключение, полное смеха.",
    },
  },
  {
    slug: "suman-thapa",
    name: "SUMAN THAPA",
    nickname: {
      vi: "Sky Ryder",
      en: "Sky Rider",
      fr: "Cavalier du Ciel",
      ru: "Небесный Всадник",
    },
    role: "Phi công Acro",
    experience: "3+ năm tại VN",
    flights: "Nhiều",
    hours: "1000+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/suman-thapa/suman-thapa.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/suman-thapa/hero-1.png",
      "/pilots/suman-thapa/hero-2.png",
      "/pilots/suman-thapa/hero-3.png",
      "/pilots/suman-thapa/hero-4.png",
      "/pilots/suman-thapa/hero-5.png",
      "/pilots/suman-thapa/content-1.png",
      "/pilots/suman-thapa/content-2.png",
      "/pilots/suman-thapa/content-3.png",
    ],
    specialties: ["Nhào lộn (Acro)", "Kỹ năng siêu đẳng"],
    certificates: ["Đào tạo chuyên nghiệp tại Nepal", "APPI (Mục tiêu)"],
    bio: {
      vi: "Những video nhào lộn ngoạn mục tại Sapa hầu hết đều là của anh – phi công dày dặn kinh nghiệm, am hiểu sâu về dù lượn. Với anh, bay không chỉ là đam mê mà là sự nghiệp. Khách hàng gọi anh bằng cái tên đặc biệt: “Con của thần gió”.",
      en: "Most of the spectacular acrobatic videos in Sapa are his – an experienced pilot with a deep understanding of paragliding. For him, flying is not just a passion but a career. Customers call him by a special name: 'Son of the Wind God'.",
      fr: "La plupart des vidéos acrobatiques spectaculaires à Sapa sont les siennes – un pilote expérimenté avec une profonde compréhension du parapente. Pour lui, voler n'est pas seulement une passion, c'est une carrière. Les clients l'appellent par un nom spécial : 'Fils du Dieu du Vent'.",
      ru: "Большинство зрелищных акробатических видео в Сапе - его рук дело – опытный пилот с глубоким пониманием парапланеризма. Для него полеты - это не просто страсть, а карьера. Клиенты называют его особым именем: 'Сын Бога Ветра'.",
    },
    funFacts: {
      vi: [
        "Anh ấy là người mà khi gió nổi lên — dù chưa cất cánh — cũng có thể nghe thấy tiếng trái tim anh reo: “Chúng ta cùng bay nhé!”",
        "Anh ấy say mê dù lượn như người ta say tách cà phê buổi sáng — không thể thiếu, không thể ngừng.",
        "Với anh, mỗi cú nhào lộn là một nụ cười khẳng định rằng: “Mình sống là để bay.”",
      ],
      en: [
        "He's the one who, when the wind picks up — even before taking off — you can hear his heart sing: 'Let's fly together!'",
        "He is as passionate about paragliding as one is about a morning cup of coffee — indispensable, unstoppable.",
        "For him, every acrobatic move is a smile that affirms: 'I live to fly.'",
      ],
      fr: [
        "C'est lui qui, lorsque le vent se lève — avant même de décoller — vous pouvez entendre son cœur chanter : 'Volons ensemble !'",
        "Il est aussi passionné de parapente que l'on peut l'être d'une tasse de café le matin — indispensable, imparable.",
        "Pour lui, chaque figure acrobatique est un sourire qui affirme : 'Je vis pour voler.'",
      ],
      ru: [
        "Это тот, кто, когда поднимается ветер — еще до взлета — вы можете услышать, как поет его сердце: 'Давай полетаем вместе!'",
        "Он так же увлечен парапланеризмом, как кто-то утренней чашкой кофе — незаменимо, неудержимо.",
        "Для него каждый акробатический трюк - это улыбка, подтверждающая: 'Я живу, чтобы летать'.",
      ],
    },
    achievements: {
      vi: [
        "Hoàn thành khoá đào tạo huấn luyện phi công chuyên nghiệp tại Nepal",
        "Phi công acro với kỹ năng nhào lộn siêu đẳng, thuần thục nhiều động tác acro",
        "Anh có hơn 1.000 giờ bay đôi chuyên nghiệp, luôn giữ an toàn tuyệt đối",
        "Đã hoạt động hơn 3 năm tại Việt Nam, có hiểu biết sâu sắc về địa hình và khí tượng trong nước",
        "Anh đặt mục tiêu trở thành huấn luyện viên dù lượn được công nhận APPI",
      ],
      en: [
        "Completed professional pilot training course in Nepal.",
        "Acro pilot with superb acrobatic skills, proficient in many acro maneuvers.",
        "He has over 1,000 hours of professional tandem flying, always maintaining absolute safety.",
        "Has been operating for over 3 years in Vietnam, with a deep understanding of the local terrain and meteorology.",
        "He aims to become an APPI-certified paragliding instructor.",
      ],
      fr: [
        "A terminé le cours de formation de pilote professionnel au Népal.",
        "Pilote d'acro avec de superbes compétences acrobatiques, maîtrisant de nombreuses manœuvres d'acro.",
        "Il a plus de 1 000 heures de vol en tandem professionnel, maintenant toujours une sécurité absolue.",
        "Opère depuis plus de 3 ans au Vietnam, avec une profonde compréhension du terrain local et de la météorologie.",
        "Il vise à devenir un instructeur de parapente certifié APPI.",
      ],
      ru: [
        "Окончил курс профессиональной подготовки пилотов в Непале.",
        "Пилот-акробат с превосходными акробатическими навыками, владеющий многими акро-маневрами.",
        "У него более 1000 часов профессиональных тандемных полетов, всегда поддерживая абсолютную безопасность.",
        "Работает более 3 лет во Вьетнаме, с глубоким пониманием местного рельефа и метеорологии.",
        "Он стремится стать инструктором по парапланеризму, сертифицированным APPI.",
      ],
    },
    flyingStyle: {
      vi: "Nhào lộn ngoạn mục, kỹ năng Acro siêu đẳng, 'Con của thần gió'.",
      en: "Spectacular acrobatics, superb Acro skills, 'Son of the Wind God'.",
      fr: "Acrobaties spectaculaires, superbes compétences Acro, 'Fils du Dieu du Vent'.",
      ru: "Зрелищная акробатика, превосходные навыки акро, 'Сын Бога Ветра'.",
    },
  },
  {
    slug: "alish-thapa",
    name: "ALISH THAPA",
    nickname: {
      vi: "Phantom bầu trời",
      en: "Sky Phantom",
      fr: "Fantôme du Ciel",
      ru: "Небесный Фантом",
    },
    role: "Huấn luyện viên SIV & APPI, Phi công Acro",
    experience: "Nhiều năm",
    flights: "Nhiều",
    hours: "Nhiều giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/alish-thapa/alish-thapa.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/alish-thapa/hero-1.png",
      "/pilots/alish-thapa/hero-2.png",
      "/pilots/alish-thapa/hero-3.png",
      "/pilots/alish-thapa/hero-4.png",
      "/pilots/alish-thapa/hero-5.png",
      "/pilots/alish-thapa/content-1.png",
      "/pilots/alish-thapa/content-2.png",
      "/pilots/alish-thapa/content-3.png",
    ],
    specialties: ["Huấn luyện APPI", "Nhảy dù (Skydive)"],
    certificates: ["Huấn luyện viên APPI", "Huấn luyện viên nhảy dù USPA"],
    bio: {
      vi: "Huấn luyện viên dù lượn chuyên nghiệp với chứng chỉ APPI, được nhiều tổ chức quốc tế mời giảng dạy. Không chỉ giỏi chuyên môn, anh còn là phi công vui tính, thân thiện, luôn mang đến những chuyến bay an toàn, thú vị và khiến hành khách quý mến ngay từ lần gặp đầu tiên.",
      en: "Professional paragliding instructor with APPI certification, invited by many international organizations to teach. Not only highly skilled, he is also a humorous and friendly pilot, always providing safe, enjoyable flights and endearing himself to passengers from the very first meeting.",
      fr: "Instructeur de parapente professionnel avec certification APPI, invité par de nombreuses organisations internationales à enseigner. Non seulement très compétent, il est aussi un pilote plein d'humour et amical, offrant toujours des vols sûrs et agréables et se faisant apprécier des passagers dès la première rencontre.",
      ru: "Профессиональный инструктор по парапланеризму с сертификатом APPI, приглашенный многими международными организациями для преподавания. Он не только высококвалифицирован, но и является пилотом с чувством юмора и дружелюбным, всегда обеспечивая безопасные, приятные полеты и располагая к себе пассажиров с первой встречи.",
    },
    funFacts: {
      vi: [
        "Anh ấy là một trong những phi công dù lượn hàng đầu tại Nepal. Với kinh nghiệm phong phú, anh đã được mời huấn luyện tại nhiều điểm bay nổi tiếng như Việt Nam, Trung Quốc, Thái Lan, nơi anh chia sẻ đam mê và kỹ thuật bay đỉnh cao.",
        "Phong cách huấn luyện của anh luôn vui vẻ, giúp học viên bay như đang nhảy múa trên không trung — không chỉ học bay mà còn học cách yêu bầu trời.",
        "Anh truyền cảm hứng và đam mê cho du khách cùng bay, và nhiều người trong số họ đã trở thành phi công chuyên nghiệp sau khi trải nghiệm bay cùng anh.",
      ],
      en: [
        "He is one of the top paragliding pilots in Nepal. With his rich experience, he has been invited to train at many famous flight spots like Vietnam, China, and Thailand, where he shares his passion and top-tier flying techniques.",
        "His training style is always cheerful, helping students fly as if they are dancing in the air — not just learning to fly but also learning to love the sky.",
        "He inspires passion in passengers flying with him, and many of them have become professional pilots after experiencing a flight with him.",
      ],
      fr: [
        "Il est l'un des meilleurs pilotes de parapente au Népal. Grâce à sa riche expérience, il a été invité à former sur de nombreux sites de vol célèbres comme le Vietnam, la Chine et la Thaïlande, où il partage sa passion et ses techniques de vol de haut niveau.",
        "Son style de formation est toujours joyeux, aidant les étudiants à voler comme s'ils dansaient dans les airs — non seulement apprendre à voler mais aussi apprendre à aimer le ciel.",
        "Il inspire la passion aux passagers qui volent avec lui, et beaucoup d'entre eux sont devenus des pilotes professionnels après avoir vécu un vol avec lui.",
      ],
      ru: [
        "Он один из лучших пилотов парапланеризма в Непале. Благодаря своему богатому опыту, его приглашали для обучения во многих известных летных местах, таких как Вьетнам, Китай и Таиланд, где он делится своей страстью и первоклассными техниками полета.",
        "Его стиль обучения всегда веселый, помогая студентам летать, как будто они танцуют в воздухе — не просто учась летать, но и учась любить небо.",
        "Он вдохновляет страсть в пассажирах, летящих с ним, и многие из них стали профессиональными пилотами после полета с ним.",
      ],
    },
    achievements: {
      vi: [
        "Người hướng dẫn chính & S&TA (An toàn và đánh giá bay) tại Skydive Chiang Mai",
        "Giám đốc điều hành tại Insky Skydive",
        "Giám đốc điều hành tại Everest Paragliding",
        "Phi công dù lượn chuyên nghiệp & huấn luyện viên tại Fishtail Nepal Paragliding",
        "Huấn luyện viên dù lượn APPI",
        "Huấn luyện viên nhảy dù (AFF-I, TAN-I) theo chuẩn USPA",
      ],
      en: [
        "Chief Instructor & S&TA (Safety and Training Advisor) at Skydive Chiang Mai",
        "CEO at Insky Skydive",
        "CEO at Everest Paragliding",
        "Professional paragliding pilot & instructor at Fishtail Nepal Paragliding",
        "APPI Paragliding Instructor",
        "USPA Skydive Instructor (AFF-I, TAN-I)",
      ],
      fr: [
        "Instructeur en chef & S&TA (Conseiller en sécurité et formation) à Skydive Chiang Mai",
        "PDG chez Insky Skydive",
        "PDG chez Everest Paragliding",
        "Pilote de parapente professionnel & instructeur chez Fishtail Nepal Paragliding",
        "Instructeur de parapente APPI",
        "Instructeur de parachutisme USPA (AFF-I, TAN-I)",
      ],
      ru: [
        "Главный инструктор и S&TA (Советник по безопасности и обучению) в Skydive Chiang Mai",
        "Генеральный директор в Insky Skydive",
        "Генеральный директор в Everest Paragliding",
        "Профессиональный пилот параплана и инструктор в Fishtail Nepal Paragliding",
        "Инструктор по парапланеризму APPI",
        "Инструктор по парашютному спорту USPA (AFF-I, TAN-I)",
      ],
    },
    flyingStyle: {
      vi: "Huấn luyện viên chuyên nghiệp, vui tính, thân thiện, bay an toàn và thú vị.",
      en: "Professional instructor, humorous, friendly, flies safely and enjoyably.",
      fr: "Instructeur professionnel, plein d'humour, amical, vole en toute sécurité et agréablement.",
      ru: "Профессиональный инструктор, с юмором, дружелюбный, летает безопасно и с удовольствием.",
    },
  },
  {
    slug: "bishal-thapa",
    name: "BISHAL THAPA",
    nickname: {
      vi: "Đặc nhiệm cánh gió",
      en: "Wind Commando",
      fr: "Commando du Vent",
      ru: "Ветряной Коммандос",
    },
    role: "Phi công",
    experience: "Từ 2016",
    flights: "3000+",
    hours: "1000+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/bishal-thapa/bishal-thapa.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/bishal-thapa/hero-1.png",
      "/pilots/bishal-thapa/hero-2.png",
      "/pilots/bishal-thapa/hero-3.png",
      "/pilots/bishal-thapa/hero-4.png",
      "/pilots/bishal-thapa/hero-5.png",
      "/pilots/bishal-thapa/content-1.png",
      "/pilots/bishal-thapa/content-2.png",
      "/pilots/bishal-thapa/content-3.png",
    ],
    specialties: ["Hạ cánh chính xác", "Vui vẻ", "Năng lượng"],
    certificates: ["Vô địch Indian Accuracy Cup", "Giải Pre-World Cup"],
    bio: {
      vi: "Đam mê hạ cánh chính xác, anh luôn đặt mục tiêu chạm đúng tâm với sai số tối thiểu. Nhờ đó, mỗi chuyến bay đều an toàn như lập trình. Vui vẻ, dễ gần, anh luôn lắng nghe và quan tâm đến cảm xúc của khách để mang lại trải nghiệm bay trọn vẹn nhất.",
      en: "Passionate about precision landing, he always aims to hit the center with minimal error. As a result, every flight is as safe as if programmed. Cheerful, approachable, he always listens to and cares about the customer's feelings to provide the most complete flying experience.",
      fr: "Passionné d'atterrissage de précision, il vise toujours à toucher le centre avec une erreur minimale. En conséquence, chaque vol est aussi sûr que s'il était programmé. Joyeux, accessible, il écoute toujours et se soucie des sentiments du client pour offrir l'expérience de vol la plus complète.",
      ru: "Увлеченный точностью приземления, он всегда стремится попасть в центр с минимальной ошибкой. В результате каждый полет безопасен, как по программе. Веселый, доступный, он всегда прислушивается к чувствам клиента и заботится о них, чтобы обеспечить наиболее полный опыт полета.",
    },
    funFacts: {
      vi: [
        "Bishal Thapa luôn mang theo cả “cục pin năng lượng” và nụ cười rạng rỡ trong mỗi chuyến bay. Anh chàng vui tính, dễ mến này biết cách làm cho bạn cảm giác như đang bay cùng một người bạn thân chứ không phải phi công!",
        "Đam mê hạ cánh chuẩn từng milimet, Bishal biến mỗi cú đáp đất thành một “vũ điệu” đẹp mắt trên bầu trời.",
        "Bay cùng anh, bạn không chỉ học bay mà còn có một chuyến phiêu lưu đầy tiếng cười và cảm xúc!",
      ],
      en: [
        "Bishal Thapa always brings a 'full battery of energy' and a bright smile on every flight. This cheerful, amiable guy knows how to make you feel like you're flying with a close friend, not just a pilot!",
        "Passionate about landing with millimeter precision, Bishal turns every landing into a beautiful 'dance' in the sky.",
        "Flying with him, you not only learn to fly but also have an adventure full of laughter and emotions!",
      ],
      fr: [
        "Bishal Thapa apporte toujours une 'batterie pleine d'énergie' et un sourire éclatant à chaque vol. Ce gars joyeux et aimable sait comment vous faire sentir comme si vous voliez avec un ami proche, pas seulement un pilote !",
        "Passionné par l'atterrissage avec une précision millimétrique, Bishal transforme chaque atterrissage en une belle 'danse' dans le ciel.",
        "En volant avec lui, vous n'apprenez pas seulement à voler, mais vous vivez aussi une aventure pleine de rires et d'émotions !",
      ],
      ru: [
        "Бишал Тапа всегда приносит 'полный заряд энергии' и яркую улыбку в каждый полет. Этот веселый, любезный парень знает, как заставить вас почувствовать, что вы летите с близким другом, а не просто с пилотом!",
        "Увлеченный приземлением с миллиметровой точностью, Бишал превращает каждое приземление в красивый 'танец' в небе.",
        "Летая с ним, вы не только учитесь летать, но и получаете приключение, полное смеха и эмоций!",
      ],
    },
    achievements: {
      vi: [
        "Anh bắt đầu học dù lượn từ năm 2016 và trở thành phi công tandem chuyên nghiệp từ năm 2019",
        "Giải Pre-World Cup Mizoram Open Accuracy Championship 2018 - Vị trí thứ hai cá nhân, đội tuyển đạt vị trí nhất toàn đoàn",
        "Giải Accuracy Paragliding Pre-World Cup 2023 - Vị trí thứ hai cá nhân, đội tuyển đứng đầu toàn đoàn",
        "Giải Indian Accuracy Cup Bilaspur - Vô địch cá nhân",
        "Kinh nghiệm bay tandem: hơn 3000 chuyến bay, với tổng thời gian bay an toàn trên 1000 giờ.",
      ],
      en: [
        "He started learning paragliding in 2016 and became a professional tandem pilot in 2019.",
        "Pre-World Cup Mizoram Open Accuracy Championship 2018 - Second place individual, team won first place overall.",
        "Accuracy Paragliding Pre-World Cup 2023 - Second place individual, team won first place overall.",
        "Indian Accuracy Cup Bilaspur - Individual champion.",
        "Tandem flying experience: over 3000 flights, with total safe flying time over 1000 hours.",
      ],
      fr: [
        "Il a commencé à apprendre le parapente en 2016 et est devenu pilote de tandem professionnel en 2019.",
        "Championnat de précision Pre-World Cup Mizoram Open 2018 - Deuxième place individuelle, l'équipe a remporté la première place au général.",
        "Pre-World Cup de précision en parapente 2023 - Deuxième place individuelle, l'équipe a remporté la première place au général.",
        "Indian Accuracy Cup Bilaspur - Champion individuel.",
        "Expérience de vol en tandem : plus de 3000 vols, avec un temps de vol total en sécurité de plus de 1000 heures.",
      ],
      ru: [
        "Он начал учиться парапланеризму в 2016 году и стал профессиональным тандем-пилотом в 2019 году.",
        "Pre-World Cup Mizoram Open Accuracy Championship 2018 - Второе место в личном зачете, команда заняла первое место в общем зачете.",
        "Accuracy Paragliding Pre-World Cup 2023 - Второе место в личном зачете, команда заняла первое место в общем зачете.",
        "Indian Accuracy Cup Bilaspur - Чемпион в личном зачете.",
        "Опыт тандемных полетов: более 3000 полетов, общее безопасное время налета более 1000 часов.",
      ],
    },
    flyingStyle: {
      vi: "Hạ cánh chính xác, an toàn như lập trình, vui vẻ và đầy năng lượng.",
      en: "Precision landing, as safe as programmed, cheerful and full of energy.",
      fr: "Atterrissage de précision, aussi sûr que programmé, joyeux et plein d'énergie.",
      ru: "Точное приземление, безопасное, как по программе, веселое и полное энергии.",
    },
  },
  {
    slug: "bishal-skyboy",
    name: "BISHAL SKYBOY",
    nickname: {
      vi: "Skyboy",
      en: "Skyboy",
      fr: "Skyboy",
      ru: "Скайбой",
    },
    role: "Phi công Acro, Phi công thi đấu",
    experience: "Nhiều năm",
    flights: "Nhiều",
    hours: "Nhiều giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/bishal-skyboy/bishal-skyboy.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/bishal-skyboy/hero-1.png",
      "/pilots/bishal-skyboy/hero-2.png",
      "/pilots/bishal-skyboy/hero-3.png",
      "/pilots/bishal-skyboy/hero-4.png",
      "/pilots/bishal-skyboy/hero-5.png",
      "/pilots/bishal-skyboy/content-1.png",
      "/pilots/bishal-skyboy/content-2.png",
      "/pilots/bishal-skyboy/content-3.png",
    ],
    specialties: ["Nhào lộn (Acro)", "Kỹ thuật đỉnh cao"],
    certificates: ["Phi công chuyên nghiệp Nepal"],
    bio: {
      vi: "Phi công chuyên nghiệp đến từ Nepal, nổi tiếng toàn cầu với kỹ năng nhào lộn Acro mãn nhãn. Không chỉ chinh phục bầu trời bằng kỹ thuật đỉnh cao, anh còn là phi công bay đôi dày dạn, mang đến trải nghiệm bay hưng phấn và khó quên cho mọi hành khách",
      en: "Professional pilot from Nepal, globally renowned for his spectacular Acro skills. Not only conquering the sky with top-notch technique, he is also an experienced tandem pilot, bringing an exhilarating and unforgettable flying experience for all passengers.",
      fr: "Pilote professionnel du Népal, de renommée mondiale pour ses compétences Acro spectaculaires. Non seulement il conquiert le ciel avec une technique de haut niveau, mais il est aussi un pilote de tandem expérimenté, apportant une expérience de vol exaltante et inoubliable à tous les passagers.",
      ru: "Профессиональный пилот из Непала, всемирно известный своими зрелищными навыками акро. Он не только покоряет небо с помощью первоклассной техники, но и является опытным тандем-пилотом, дарящим волнующий и незабываемый опыт полета всем пассажирам.",
    },
    funFacts: {
      vi: [
        "Nổi tiếng toàn cầu với kỹ năng nhào lộn Acro mãn nhãn.",
        "Mang đến trải nghiệm bay hưng phấn và khó quên.",
      ],
      en: [
        "Globally renowned for spectacular Acro skills.",
        "Brings an exhilarating and unforgettable flying experience.",
      ],
      fr: [
        "De renommée mondiale pour ses compétences Acro spectaculaires.",
        "Apporte une expérience de vol exaltante et inoubliable.",
      ],
      ru: [
        "Всемирно известен зрелищными навыками акро.",
        "Дарит волнующий и незабываемый опыт полета.",
      ],
    },
    achievements: {
      vi: [
        "Phi công chuyên nghiệp đến từ Nepal.",
        "Nổi tiếng toàn cầu với kỹ năng nhào lộn Acro.",
        "Phi công bay đôi dày dạn kinh nghiệm.",
      ],
      en: [
        "Professional pilot from Nepal.",
        "Globally renowned for Acro skills.",
        "Experienced tandem pilot.",
      ],
      fr: [
        "Pilote professionnel du Népal.",
        "De renommée mondiale pour ses compétences Acro.",
        "Pilote de tandem expérimenté.",
      ],
      ru: [
        "Профессиональный пилот из Непала.",
        "Всемирно известен навыками акро.",
        "Опытный тандем-пилот.",
      ],
    },
    flyingStyle: {
      vi: "Kỹ năng nhào lộn Acro mãn nhãn, kỹ thuật đỉnh cao, trải nghiệm hưng phấn.",
      en: "Spectacular Acro skills, top-notch technique, exhilarating experience.",
      fr: "Compétences Acro spectaculaires, technique de haut niveau, expérience exaltante.",
      ru: "Зрелищные навыки акро, первоклассная техника, волнующий опыт.",
    },
  },
  {
    slug: "subash-thapa",
    name: "SUBASH THAPA",
    nickname: {
      vi: "Kỵ sỹ không trung",
      en: "Sky Knight",
      fr: "Chevalier du Ciel",
      ru: "Небесный Рыцарь",
    },
    role: "Huấn luyện viên, Phi công Acro",
    experience: "3+ năm tại VN",
    flights: "Nhiều",
    hours: "4000+ giờ",
    phone: "0964073555", // (Placeholder)
    avatar: "/pilots/subash-thapa/subash-thapa.png",
    hero: "/pilots/hero.jpg",
    gallery: [
      "/pilots/subash-thapa/hero-1.png",
      "/pilots/subash-thapa/hero-2.png",
      "/pilots/subash-thapa/hero-3.png",
      "/pilots/subash-thapa/hero-4.png",
      "/pilots/subash-thapa/hero-5.png",
      "/pilots/subash-thapa/content-1.png",
      "/pilots/subash-thapa/content-2.png",
      "/pilots/subash-thapa/content-3.png",
    ],
    specialties: ["Huấn luyện", "Âm nhạc", "Nhảy dù"],
    certificates: ["Phi công trưởng"],
    bio: {
      vi: "Huấn luyện viên dù lượn chuyên nghiệp đã đào tạo rất nhiều phi công dù lượn trên thế giới. Anh không chỉ có đam mê dù lượn mà còn yêu thích âm nhạc, chính vì thế mọi chuyến bay đôi cùng anh đều sống động và đầy cảm hứng",
      en: "Professional paragliding instructor who has trained many paragliding pilots around the world. He not only has a passion for paragliding but also loves music, which is why every tandem flight with him is lively and full of inspiration.",
      fr: "Instructeur de parapente professionnel qui a formé de nombreux pilotes de parapente à travers le monde. Il n'a pas seulement une passion pour le parapente mais aime aussi la musique, c'est pourquoi chaque vol en tandem avec lui est vivant et plein d'inspiration.",
      ru: "Профессиональный инструктор по парапланеризму, обучивший многих пилотов парапланеризма по всему миру. У него не только страсть к парапланеризму, но и любовь к музыке, поэтому каждый тандемный полет с ним живой и полный вдохновения.",
    },
    funFacts: {
      vi: [
        "Subash Thapa không chỉ là huấn luyện viên dù lượn siêu đỉnh mà còn là “DJ trên không” với tình yêu âm nhạc cháy bỏng, khiến mỗi chuyến bay đôi như một bữa tiệc vui nhộn giữa trời xanh!",
        "Đã gần 3 năm ở Việt Nam, Subash thuộc lòng mọi cung đường đặc thù về thời tiết, giúp chuyến bay của bạn mượt mà như mơ.",
        "Bay cùng anh, bạn không chỉ trải nghiệm cái sải cánh bền bỉ mà còn có thêm một người bạn vui tính, đầy năng lượng tích cực!",
      ],
      en: [
        "Subash Thapa is not only a top-notch paragliding instructor but also an 'aerial DJ' with a burning love for music, making every tandem flight a fun party in the blue sky!",
        "Having been in Vietnam for nearly 3 years, Subash knows every specific weather route by heart, helping your flight go as smoothly as a dream.",
        "Flying with him, you not only experience a sturdy wingspan but also gain a cheerful friend full of positive energy!",
      ],
      fr: [
        "Subash Thapa n'est pas seulement un instructeur de parapente de premier plan, mais aussi un 'DJ aérien' avec un amour brûlant pour la musique, faisant de chaque vol en tandem une fête amusante dans le ciel bleu !",
        "Étant au Vietnam depuis près de 3 ans, Subash connaît par cœur chaque itinéraire météorologique spécifique, aidant votre vol à se dérouler aussi doucement qu'un rêve.",
        "En volant avec lui, vous n'expérimentez pas seulement une envergure robuste, mais vous gagnez aussi un ami joyeux plein d'énergie positive !",
      ],
      ru: [
        "Субаш Тапа - не только первоклассный инструктор по парапланеризму, но и 'воздушный диджей' с горячей любовью к музыке, превращающий каждый тандемный полет в веселую вечеринку в голубом небе!",
        "Прожив во Вьетнаме почти 3 года, Субаш наизусть знает каждый специфический погодный маршрут, помогая вашему полету пройти гладко, как во сне.",
        "Летая с ним, вы не только ощущаете крепкое крыло, но и приобретаете веселого друга, полного позитивной энергии!",
      ],
    },
    achievements: {
      vi: [
        "Phi công trưởng, huấn luyện viên dù lượn và nhảy dù tại Pokhara.",
        "Phi công trưởng tại Nepal Acro Paragliding.",
        "Từng đảm nhiệm vị trí Phi công trưởng tại New Para World Paragliding.",
        "Sở hữu hơn 4.000 giờ bay tandem chuyên nghiệp, luôn tối ưu hoá an toàn của hành khách lên hàng đầu.",
        "Với hơn 4 năm kinh nghiệm hoạt động tại Việt Nam, anh có kiến thức vững chắc về địa hình và điều kiện thời tiết",
      ],
      en: [
        "Chief pilot, paragliding and skydiving instructor in Pokhara.",
        "Chief pilot at Nepal Acro Paragliding.",
        "Previously held the position of Chief Pilot at New Para World Paragliding.",
        "Possesses over 4,000 hours of professional tandem flying, always prioritizing passenger safety.",
        "With over 4 years of experience operating in Vietnam, he has solid knowledge of the terrain and weather conditions.",
      ],
      fr: [
        "Pilote en chef, instructeur de parapente et de parachutisme à Pokhara.",
        "Pilote en chef chez Nepal Acro Paragliding.",
        "Auparavant occupé le poste de pilote en chef chez New Para World Paragliding.",
        "Possède plus de 4 000 heures de vol en tandem professionnel, priorisant toujours la sécurité des passagers.",
        "Avec plus de 4 ans d'expérience au Vietnam, il a une solide connaissance du terrain et des conditions météorologiques.",
      ],
      ru: [
        "Главный пилот, инструктор по парапланеризму и парашютному спорту в Покхаре.",
        "Главный пилот в Acro Paragliding.",
        "Ранее занимал должность главного пилота в New Para World Paragliding.",
        "Имеет более 4000 часов профессиональных тандемных полетов, всегда ставя безопасность пассажиров превыше всего.",
        "Имея более 4 лет опыта работы во Вьетнаме, он обладает солидными знаниями о местности и погодных условиях.",
      ],
    },
    flyingStyle: {
      vi: "Chuyến bay sống động, đầy cảm hứng âm nhạc, mượt mà và an toàn.",
      en: "A lively flight, full of musical inspiration, smooth and safe.",
      fr: "Un vol animé, plein d'inspiration musicale, fluide et sûr.",
      ru: "Живой полет, полный музыкального вдохновения, плавный и безопасный.",
    },
  },

  {
  slug: "dang-van-my",
  name: "Đặng Văn Mỹ",
  nickname: {
    vi: "Đội trưởng Mỹ",
    en: "Captain America",
    fr: "Captain America",
    ru: "Капитан Америка",
  },
  role: "Phi công trưởng, Phi công PG & PPG",
  experience: "10 năm",
  flights: "7000+",
  hours: "Nhiều giờ",
  phone: "0964073555", // (Placeholder)
  avatar: "/pilots/dang-van-my/dang-van-my.png",
  hero: "/pilots/hero.jpg",
  gallery: [
    "/pilots/dang-van-my/hero-1.png",
    "/pilots/dang-van-my/hero-2.png",
    "/pilots/dang-van-my/hero-3.png",
    "/pilots/dang-van-my/hero-4.png",
    "/pilots/dang-van-my/hero-5.png",
    "/pilots/dang-van-my/content-1.png",
    "/pilots/dang-van-my/content-2.png",
    "/pilots/dang-van-my/content-3.png",
  ],
  specialties: ["Heli", "Tumbling", "Dịch giả"],
  certificates: ["IPPI5 Nhật Bản"],
  bio: {
    vi: "10 năm kinh nghiệm, 1,000+ chuyến bay đơn, 6,000+ chuyến bay đôi. Anh là phi công Heli đầu tiên tại Việt Nam và là phi công nhảy dây (tumbling) đầu tiên & duy nhất tại Việt Nam.",
    en: "10 years of experience, 1,000+ solo flights, 6,000+ tandem flights. The first Heli pilot in Vietnam and the first & only tumbling pilot in Vietnam.",
    fr: "10 ans d'expérience, 1 000+ vols solo, 6 000+ vols en tandem. Le premier pilote Heli au Vietnam et le premier & unique pilote de tumbling (voltige) au Vietnam.",
    ru: "10 лет опыта, 1000+ одиночных полетов, 6 000+ тандемных полетов. Первый пилот Heli во Вьетнаме и первый и единственный пилот по тамблингу (акробатика) во Вьетнаме.",
  },
  funFacts: {
    vi: [
      "Khi ở dưới mặt đất, anh là người siêu kỷ luật với công việc và nhiệm vụ điều hành. Nhưng chỉ cần cất cánh, anh liền hoá thân thành người con của gió, mang theo niềm vui và truyền cảm hứng đam mê cho mọi hành khách bay cùng.",
    ],
    en: [
      "On the ground, he is super disciplined with his work and operational duties. But as soon as he takes off, he transforms into a child of the wind, bringing joy and inspiring passion in every passenger flying with him.",
    ],
    fr: [
      "Au sol, il est super discipliné dans son travail et ses fonctions opérationnelles. Mais dès qu'il décolle, il se transforme en enfant du vent, apportant de la joie et inspirant la passion à chaque passager qui vole avec lui.",
    ],
    ru: [
      "На земле он супер дисциплинирован в своей работе и операционных обязанностях. Но как только он взлетает, он превращается в дитя ветра, принося радость и вдохновляя страсть в каждом пассажире, летящем с ним.",
    ],
  },
  achievements: {
    vi: [
      "10 năm kinh nghiệm, 1,000+ chuyến bay đơn, 6,000+ chuyến bay đôi.",
      "Phi công Heli đầu tiên tại Việt Nam và Phi công nhảy dù (tumbling) đầu tiên & duy nhất tại Việt Nam. Anh có thể thực hiện các động tác mạnh với kỹ thuật cao và các động tác nhào lộn trên không hiếm có.",
      "Sở hữu kỹ năng bay dù lượn và dù lượn gắn động cơ.",
      "Dịch giả của hơn 1,000 trang sách chuyên sâu về dù lượn và là phi công nổi tiếng có kiến thức chuyên sâu về dù lượn. Anh sở hữu 03 đầu sách bán chạy nhất về dù lượn: Bay thermal, Bay đường trường và Thấu hiểu bầu trời.",
      "Dịch rất nhiều tài liệu bay, có nhiều kiến thức chuyên môn, phi công đầu tiên nhận chứng chỉ bay IPPI5 của Nhật Bản.",
      "Đang nắm giữ kỷ lục chuyến bay Tam giác khép kín lớn nhất tại Tây Nguyên 100+km và là phi công có nhiều giờ bay nhất Việt Nam.",
    ],
    en: [
      "10 years of experience, 1,000+ solo flights, 6,000+ tandem flights.",
      "The first Heli pilot in Vietnam and the first & only tumbling pilot in Vietnam. He can perform high-G maneuvers, advanced techniques, and rare aerial acrobatics.",
      "Skilled in both paragliding and powered paragliding (paramotor).",
      "Translator of over 1,000 pages of in-depth paragliding books. Author of 3 bestselling paragliding books: 'Thermal Flying', 'Cross-Country Flying', and 'Understanding the Sky'.",
      "Translated numerous flying documents, possesses deep technical knowledge, and is the first pilot to receive the IPPI5 certification from Japan.",
      "Currently holds the record for the largest closed triangle flight in the Central Highlands (100+km) and is the pilot with the most flight hours in Vietnam.",
    ],
    fr: [
      "10 ans d'expérience, 1 000+ vols solo, 6 000+ vols en tandem.",
      "Le premier pilote Heli au Vietnam et le premier & unique pilote de tumbling (voltige) au Vietnam. Il peut effectuer des manœuvres à haute gravité, des techniques avancées et des acrobaties aériennes rares.",
      "Compétent en parapente et en paramoteur (parapente motorisé).",
      "Traducteur de plus de 1 000 pages de livres approfondis sur le parapente. Auteur de 3 livres à succès sur le parapente : 'Vol thermique', 'Vol de distance' et 'Comprendre le ciel'.",
      "A traduit de nombreux documents de vol, possède des connaissances techniques approfondies et est le premier pilote à recevoir la certification IPPI5 du Japon.",
      "Détient actuellement le record du plus grand vol en triangle fermé dans les Hauts Plateaux du Centre (100+ km) et est le pilote avec le plus d'heures de vol au Vietnam.",
    ],
    ru: [
      "10 лет опыта, 1000+ одиночных полетов, 6 000+ тандемных полетов.",
      "Первый пилот Heli во Вьетнаме и первый и единственный пилот по тамблингу (акробатика) во Вьетнаме. Он может выполнять маневры с высокими перегрузками, продвинутые техники и редкие воздушные акробатические трюки.",
      "Владеет навыками как парапланеризма, так и парамоторинга (полеты с мотором).",
      "Переводчик более 1000 страниц углубленных книг о парапланеризме. Автор 3 бестселлеров о парапланеризме: 'Полеты в термиках', 'Маршрутные полеты' и 'Понимание неба'.",
      "Перевел множество летных документов, обладает глубокими техническими знаниями и является первым пилотом, получившим сертификат IPPI5 из Японии.",
      "В настоящее время является рекордсменом по самому большому полету по замкнутому треугольнику в Центральном нагорье (100+ км) и пилотом с наибольшим количеством летных часов во Вьетнаме.",
    ],
  },
  flyingStyle: {
    vi: "Kỹ thuật cao, thực hiện các động tác mạnh và nhào lộn hiếm có.",
    en: "High-tech, performs strong maneuvers and rare acrobatics.",
    fr: "Haute technique, exécute des manœuvres puissantes et des acrobaties rares.",
    ru: "Высокая техника, выполнение сложных маневров и редких акробатических трюков.",
  },
}
];