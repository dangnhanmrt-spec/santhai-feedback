import { OpenLocationCode } from "open-location-code";

export const WEATHER_STORES = [
{"n":"Xô Viết Nghệ Tĩnh","r":"CẦN THƠ","a":"80 Đ. Xô Viết Nghệ Tĩnh, Ninh Kiều, Cần Thơ","la":10.0388529,"lo":105.7809432,"pc":"2QQM+GC Ninh Kiều, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/swr7SJHUa9qsndH39"},
{"n":"Nguyễn Văn Cừ 2","r":"CẦN THƠ","a":"263 Nguyễn Văn Cừ Nối Dài, An Bình, Cần Thơ","la":10.0231664,"lo":105.7086331,"pc":"2PFV+7V An Bình, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/RLuurXfGP5iQoAci7"},
{"n":"Nguyễn Văn Linh","r":"CẦN THƠ","a":"327 Nguyễn Văn Linh, Tân An, Cần Thơ","la":10.0304129,"lo":105.7552127,"pc":"2QG4+GX Tân An, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/PWcXVCrRBwHExV546"},
{"n":"3 Tháng 2","r":"CẦN THƠ","a":"104 Đường 3 Tháng 2, Tân An, Cần Thơ","la":10.0170953,"lo":105.7247932,"pc":"2Q86+R8 Tân An, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/oUTACLu7fuE3FgSy7"},
{"n":"Mậu Thân","r":"CẦN THƠ","a":"30B Mậu Thân, Ninh Kiều, Cần Thơ","la":10.0345326,"lo":105.7550393,"pc":"2QMF+R9 Ninh Kiều, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/FDd1EzBpHyjipGHo7"},
{"n":"Nguyễn Văn Cừ 1","r":"CẦN THƠ","a":"138z6 Nguyễn Văn Cừ Nối Dài, Tân An, Cần Thơ","la":10.0345746,"lo":105.7550393,"pc":"2QQ6+WC Tân An, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/ujT63SYxbFgEduSo6"},
{"n":"Phạm Hùng","r":"CẦN THƠ","a":"165/2 Phạm Hùng, Cái Răng, Cần Thơ","la":10.0003271,"lo":105.7476441,"pc":"2Q22+43 Cái Răng, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/tYkQ6ye3q5Lf5RYHA"},
{"n":"Thốt Nốt","r":"CẦN THƠ","a":"538 Thốt Nốt, Cần Thơ","la":10.2751875,"lo":105.5295625,"pc":"7GGH+3R Thốt Nốt, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/MdkCe2dvRVp4Vs8J6"},
{"n":"Ô Môn","r":"CẦN THƠ","a":"173 Đường 26 Tháng 3, Ô Môn, Cần Thơ","la":10.1130353,"lo":105.6026259,"pc":"4J7C+8F Ô Môn, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/jYAJefAkhXvsJrya6"},
{"n":"Cờ Đỏ 1","r":"CẦN THƠ","a":"Ấp Thới Bình, TT. Cờ Đỏ, Cần Thơ","la":10.091013,"lo":105.432805,"pc":"3CRM+C4C Cờ Đỏ, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/vvRXWxg32rgm8tdL9"},
{"n":"Cờ Đỏ 2","r":"CẦN THƠ","a":"615 TL921, Ấp Thạnh Lộc 2, Trung Nhứt, Cần Thơ","la":10.2070603,"lo":105.5091,"pc":"6G45+RJX Trung Nhứt, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/UoovrxinQMXy1iYS7"},
{"n":"Thới Lai","r":"CẦN THƠ","a":"Hồ Thị Thưởng, Thới Lai, Cần Thơ","la":10.0648988,"lo":105.5596808,"pc":"3H75+XW6 Thới Lai, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/P1tXFjbaTNZaf3uX9"},
{"n":"Phong Điền","r":"CẦN THƠ","a":"76 Phan Văn Trị, Phong Điền, Cần Thơ","la":9.9974873,"lo":105.6685593,"pc":"XMWC+XF Phong Điền, Cần Thơ, Việt Nam","m":"https://maps.app.goo.gl/PzixyAp4zTXWtfVJ6"},
{"n":"Ngã Bảy","r":"HẬU GIANG","a":"858 Hùng Vương, Ngã Bảy, Hậu Giang","la":9.8155504,"lo":105.813601,"pc":"RR88+6F Ngã Bảy, Hậu Giang, Việt Nam","m":"https://maps.app.goo.gl/TAC6kgVVJN2zXDue8"},
{"n":"Vị Thanh","r":"HẬU GIANG","a":"66 Nguyễn Công Trứ, Vị Thanh, Hậu Giang","la":9.7787659,"lo":105.4636127,"pc":"QFH8+GF Vị Thanh, Hậu Giang, Việt Nam","m":"https://maps.app.goo.gl/4DTYPDx6TG9gbqW27"},
{"n":"Cái Tắc","r":"HẬU GIANG","a":"23 QL61, Đông Phước, Hậu Giang","la":9.9246136,"lo":105.7222301,"pc":"WPFF+RW Đông Phước, Hậu Giang, Việt Nam","m":"https://maps.app.goo.gl/f2LHkSLyXSVXw6ZS9"},
{"n":"Ngã Năm","r":"SÓC TRĂNG","a":"82 Mai Thanh Thế, Ngã Năm, Sóc Trăng","la":9.5628521,"lo":105.5955406,"pc":"HH7W+37 Ngã Năm, Sóc Trăng, Việt Nam","m":"https://maps.app.goo.gl/T5ftJC57DaSY2h898"},
{"n":"Sóc Trăng","r":"SÓC TRĂNG","a":"55 Đường 30 Tháng 4, Sóc Trăng","la":9.6018842,"lo":105.9728632,"pc":"JX2G+Q5 Sóc Trăng, Sóc Trăng, Việt Nam","m":"https://maps.app.goo.gl/YFb5qzZFeZDCGn4r7"},
{"n":"Thành Thái","r":"AN GIANG","a":"41 Thành Thái, Bình Đức, Long Xuyên, An Giang","la":10.3917054,"lo":105.4200273,"pc":"9CRF+M2 Bình Đức, An Giang, Việt Nam","m":"https://maps.app.goo.gl/CnojZQMvPvRPFos78"},
{"n":"Trần Hưng Đạo 1","r":"AN GIANG","a":"1328 Trần Hưng Đạo, Long Xuyên, An Giang","la":10.3793125,"lo":105.4393125,"pc":"9CHQ+PP Long Xuyên, An Giang, Việt Nam","m":"https://maps.app.goo.gl/7uqBbU5D4zwK56c2A"},
{"n":"Trần Hưng Đạo 2","r":"AN GIANG","a":"2243 Trần Hưng Đạo, Mỹ Thới, An Giang","la":10.3485625,"lo":105.4630625,"pc":"8FX7+C6 Mỹ Thới, An Giang, Việt Nam","m":"https://maps.app.goo.gl/LKgUNRUsQaNVkfNUA"},
{"n":"Phú Hoà","r":"AN GIANG","a":"249 Trần Phú, Phú Hoà, Thoại Sơn, An Giang","la":10.3584882,"lo":105.3729668,"pc":"995G+96 Phú Hòa, An Giang, Việt Nam","m":"https://maps.app.goo.gl/Vxz9f1JwToNy5cvB6"},
{"n":"An Châu","r":"AN GIANG","a":"TT. An Châu, An Giang","la":10.4442812,"lo":105.3536359,"pc":"C9VM+PH3 An Châu, An Giang, Việt Nam","m":"https://maps.app.goo.gl/sZaW6w6GtcMxSpFo6"},
{"n":"Tân Châu","r":"AN GIANG","a":"103 Nguyễn Tri Phương, Tân Châu, An Giang","la":10.7994375,"lo":105.2414375,"pc":"Q6XR+QH Tân Châu, An Giang, Việt Nam","m":"https://maps.app.goo.gl/dhCE9T577pHhqDdK8"},
{"n":"Mỹ Luông","r":"AN GIANG","a":"Long Điền, Chợ Mới, An Giang","la":10.5067636,"lo":105.4913236,"pc":"GF4R+QG6 Long Điền, An Giang, Việt Nam","m":"https://maps.app.goo.gl/QwKvBbYgibti6VRF6"},
{"n":"Cái Dầu","r":"AN GIANG","a":"191 QL91, Châu Phú, An Giang","la":10.5725885,"lo":105.2401275,"pc":"H6CR+9FP Châu Phú, An Giang, Việt Nam","m":"https://maps.app.goo.gl/zaJZBayZEog1G4gN6"},
{"n":"Cần Đăng","r":"AN GIANG","a":"Xã Cần Đăng, Châu Thành, An Giang","la":10.455327,"lo":105.2986259,"pc":"F74X+4F Cần Đăng, An Giang, Việt Nam","m":"https://maps.app.goo.gl/sD1yj7wNSbSTGRG5A"},
{"n":"Chợ Mới","r":"AN GIANG","a":"Nguyễn Hữu Cảnh, Chợ Mới, An Giang","la":10.5447002,"lo":105.4005057,"pc":"GCV3+V6P Chợ Mới, An Giang, Việt Nam","m":"https://maps.app.goo.gl/8CfK3mDbPA6eqrDg6"},
{"n":"Châu Đốc","r":"AN GIANG","a":"43 Nguyễn Văn Thoại, Châu Đốc, An Giang","la":10.7085614,"lo":105.0991843,"pc":"P459+C3 Châu Đốc, An Giang, Việt Nam","m":"https://maps.app.goo.gl/8QrjAKK6Qzr2GQxB9"},
{"n":"Sa Đéc","r":"ĐỒNG THÁP","a":"177 Trần Phú, Sa Đéc, Đồng Tháp","la":10.2896064,"lo":105.7502717,"pc":"7QV4+25 Sa Đéc, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/neMDHfNETcSCSdYX7"},
{"n":"Cao Lãnh 1","r":"ĐỒNG THÁP","a":"89 Đường 30 Tháng 4, Cao Lãnh, Đồng Tháp","la":10.4613026,"lo":105.6275408,"pc":"FJ6J+G2 Cao Lãnh, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/VsLQZZ2646NJoshW8"},
{"n":"Cao Lãnh 2","r":"ĐỒNG THÁP","a":"740 Phạm Hữu Lầu, Cao Lãnh, Đồng Tháp","la":10.4282339,"lo":105.6321811,"pc":"CJHM+7W Cao Lãnh, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/MPMQ9DxmHPrLWzzh6"},
{"n":"Tháp Mười","r":"ĐỒNG THÁP","a":"12 Hùng Vương, Tháp Mười, Đồng Tháp","la":10.5176086,"lo":105.8449203,"pc":"GR9W+43 Tháp Mười, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/wAnCxxu4taU1j11h8","h":true},
{"n":"Thanh Bình","r":"ĐỒNG THÁP","a":"368 Lê Văn Nhung, Thanh Bình, Đồng Tháp","la":10.5558161,"lo":105.4915591,"pc":"HF4V+8M Thanh Bình, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/F95WtAVzWVhhjd6B9"},
{"n":"Mỹ Long","r":"ĐỒNG THÁP","a":"Ấp 1, Mỹ Hiệp, Cao Lãnh, Đồng Tháp","la":10.3527241,"lo":105.7802963,"pc":"9Q3J+348 Mỹ Hiệp, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/p3khBYVo5KS77gML8"},
{"n":"Cái Tàu Hạ","r":"ĐỒNG THÁP","a":"101 Nguyễn Văn Voi, Phú Hựu, Đồng Tháp","la":10.2584133,"lo":105.8543683,"pc":"7V5F+94 Phú Hựu, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/s586h2sy2CC2THty5"},
{"n":"Lai Vung","r":"ĐỒNG THÁP","a":"320 Lê Lợi, Lai Vung, Đồng Tháp","la":10.2848557,"lo":105.6540956,"pc":"7MQ5+9C Hòa Long, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/nkRi3k3JckQV8TxH8"},
{"n":"Lấp Vò","r":"ĐỒNG THÁP","a":"100A QL80, TT. Lấp Vò, Đồng Tháp","la":10.3540535,"lo":105.5087696,"pc":"9G35+JG Lấp Vò, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/WMDMvdf7BXdf73xX7"},
{"n":"Mỹ Thọ","r":"ĐỒNG THÁP","a":"19 Nguyễn Trãi, TT. Mỹ Thọ, Cao Lãnh, Đồng Tháp","la":10.4454275,"lo":105.6964991,"pc":"CMWW+5M7 Mỹ Thọ, Đồng Tháp, Việt Nam","m":"https://maps.app.goo.gl/6HgAQ5tBRL76q9D86"},
{"n":"Rạch Giá 1","r":"KIÊN GIANG","a":"116 Nguyễn Trung Trực, Rạch Giá, Kiên Giang","la":10.0034375,"lo":105.0875625,"pc":"233Q+92 Rạch Giá, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/oJNgpFn1iczpzgB47"},
{"n":"Rạch Giá 2","r":"KIÊN GIANG","a":"1120 Nguyễn Trung Trực, An Bình, Rạch Giá, Kiên Giang","la":9.9685625,"lo":105.1120625,"pc":"X496+CR Rạch Giá, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/nrRP8L65yC4N8Ae96"},
{"n":"Giồng Riềng","r":"KIÊN GIANG","a":"Khu phố 6, Giồng Riềng, Kiên Giang","la":9.9092779,"lo":105.318779,"pc":"W859+PG6 Giồng Riềng, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/EGhZh7jvuqjWcQjy9"},
{"n":"Minh Lương","r":"KIÊN GIANG","a":"726 Khu phố Minh An, Châu Thành, Kiên Giang","la":9.9046875,"lo":105.1589375,"pc":"W535+VH Châu Thành, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/jjCfWY4B2NkNvihv8"},
{"n":"Rạch Giá 3","r":"KIÊN GIANG","a":"569 Nguyễn Trung Trực, Vĩnh Hiệp, Rạch Giá, Kiên Giang","la":9.9850236,"lo":105.1014294,"pc":"X4P2+2HX Rạch Giá, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/DE7vrLBnm1qxvfyH7","h":true},
{"n":"An Biên","r":"KIÊN GIANG","a":"An Biên, Kiên Giang","la":9.8116123,"lo":105.0615865,"pc":"R366+RPC An Biên, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/FNkuHGPhAdzHYkSz6"},
{"n":"Thứ 11","r":"KIÊN GIANG","a":"An Minh, Kiên Giang","la":9.6176167,"lo":104.9446716,"pc":"JW9V+2VV An Minh, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/Krkt2p6G1sMRr8fe9"},
{"n":"Tân Hiệp KG","r":"KIÊN GIANG","a":"Tân Hiệp, Kiên Giang","la":10.1126642,"lo":105.2807312,"pc":"477J+379 Tân Hiệp, Kiên Giang, Việt Nam","m":"https://maps.app.goo.gl/xCNa7kmjkgAyAZpZ9"},
{"n":"Trưng Nữ Vương","r":"VĨNH LONG","a":"64 Trưng Nữ Vương, Long Châu, Vĩnh Long","la":10.2538568,"lo":105.9686998,"pc":"7X3C+GG Long Châu, Vĩnh Long, Việt Nam","m":"https://maps.app.goo.gl/JfyfDghVoAMYRHLX6"},
{"n":"Long Hồ","r":"VĨNH LONG","a":"Phước Yên A, Phú Quới, Vĩnh Long","la":10.1649242,"lo":105.9257253,"pc":"5W7H+X87 Phú Quới, Vĩnh Long, Việt Nam","m":"https://maps.app.goo.gl/UvvzwZCbJw8Dhnq19"},
{"n":"Bình Minh","r":"VĨNH LONG","a":"198 Nguyễn Văn Thảnh, Bình Minh, Vĩnh Long","la":10.0687889,"lo":105.8101431,"pc":"3R97+G3 Bình Minh, Vĩnh Long, Việt Nam","m":"https://maps.app.goo.gl/o5nx5LsPvLHtoBj67"},
{"n":"Bình Tân","r":"VĨNH LONG","a":"Tân Quới, Bình Tân, Vĩnh Long","la":10.1031658,"lo":105.7584415,"pc":"4Q35+7F Tân Quới, Vĩnh Long, Việt Nam","m":"https://maps.app.goo.gl/t1d4bPbii8CNEW3D6"},
{"n":"Trà Ôn","r":"VĨNH LONG","a":"120 Đường 30/4, Trà Ôn, Vĩnh Long","la":9.9683885,"lo":105.9244683,"pc":"XW9G+9R Trà Ôn, Vĩnh Long, Việt Nam","m":"https://maps.app.goo.gl/u58x75TXv3VJ7oWG9"},
{"n":"Tam Bình","r":"VĨNH LONG","a":"89 Võ Tấn Đức, Tam Bình, Vĩnh Long","la":10.0500581,"lo":105.9983563,"pc":"3222+29 Tam Bình, Vĩnh Long, Việt Nam","m":"https://maps.app.goo.gl/74APd7Y75TpQSCSC9"},
{"n":"Trà Vinh","r":"TRÀ VINH","a":"48 Điện Biên Phủ, Trà Vinh","la":9.9339194,"lo":106.3387785,"pc":"W8MR+HG Trà Vinh, Trà Vinh, Việt Nam","m":"https://maps.app.goo.gl/ywfdsD3WFL8NiW2a9"},
{"n":"Tiểu Cần","r":"TRÀ VINH","a":"Khóm 4, Tiểu Cần, Trà Vinh","la":9.8132461,"lo":106.1917349,"pc":"R57R+7P Tiểu Cần, Trà Vinh, Việt Nam","m":"https://maps.app.goo.gl/McSPLendB8wkpHqA8"},
{"n":"Lê Đại Hành","r":"TIỀN GIANG","a":"193 Lê Đại Hành, Mỹ Tho, Tiền Giang","la":10.3558125,"lo":106.3654375,"pc":"9948+85 Mỹ Tho, Tiền Giang, Việt Nam","m":"https://maps.app.goo.gl/CkfRFwvGXgfQLfGFA"},
{"n":"Ấp Bắc","r":"TIỀN GIANG","a":"236 Ấp Bắc, Đạo Thạnh, Tiền Giang","la":10.3654375,"lo":106.3571875,"pc":"9984+5V Đạo Thạnh, Tiền Giang, Việt Nam","m":"https://maps.app.goo.gl/JgRcP4f95Mhdb5F46"},
{"n":"Bến Tre","r":"BẾN TRE","a":"31C Đoàn Hoàng Minh, An Hội, Bến Tre","la":10.236843,"lo":106.3508552,"pc":"69P9+PP An Hội, Bến Tre, Việt Nam","m":"https://maps.app.goo.gl/u8BzbVjccyZYesUQ9"},
{"n":"Ba Tri","r":"BẾN TRE","a":"35 Mười Chín Tháng Năm, Ba Tri, Bến Tre","la":10.0457197,"lo":106.5875223,"pc":"2HWR+72 Ba Tri, Bến Tre, Việt Nam","m":"https://maps.app.goo.gl/eHwscZCenkUis1YZ7"},
{"n":"Tân An","r":"LONG AN","a":"182 Hùng Vương, Tân An, Long An","la":10.5353975,"lo":106.4040619,"pc":"GCP4+5M Tân An, Long An, Việt Nam","m":"https://maps.app.goo.gl/ambMtC5NJ8Yytf678"},
{"n":"Tân Hiệp TG","r":"TIỀN GIANG","a":"922 QL1A, Châu Thành, Tiền Giang","la":10.4579375,"lo":106.3476875,"pc":"F85X+53 Châu Thành, Tiền Giang, Việt Nam","m":"https://maps.app.goo.gl/vd8J4CWJvBFYnsrZ6"},
{"n":"Cần Đước","r":"LONG AN","a":"Rạch Kiến, Cần Đước, Long An","la":10.4123322,"lo":105.2844435,"pc":"HHMQ+9Q Rạch Kiến, Long An, Việt Nam","m":"https://maps.app.goo.gl/zDcLPUrwJNeFAHQQ6","h":true},
{"n":"Gò Công","r":"TIỀN GIANG","a":"361 Nguyễn Huệ, Gò Công, Tiền Giang","la":10.3592937,"lo":106.6757505,"pc":"9M5G+M8 Long Thuận, Tiền Giang, Việt Nam","m":"https://maps.app.goo.gl/eWYruG8ekMenv7u26"},
{"n":"Mỹ Hạnh Bắc","r":"LONG AN","a":"Mỹ Hạnh Bắc, Đức Hòa, Long An","la":10.8771647,"lo":106.5083155,"pc":"VGG5+V88 Đức Hòa, Long An, Việt Nam","m":"https://maps.app.goo.gl/uvGUr1upijpKpwBr5"},
{"n":"Đức Hòa","r":"LONG AN","a":"Khu phố 5, Đức Hòa, Long An","la":10.8258375,"lo":106.4590156,"pc":"RFG5+8JJ Đức Hòa, Long An, Việt Nam","m":"https://maps.app.goo.gl/XW4QA9P1QEM96P6J8"},
{"n":"Bến Lức","r":"LONG AN","a":"192 Phan Văn Mãng, Bến Lức, Long An","la":10.6281426,"lo":106.4915339,"pc":"JFHV+7J Bến Lức, Long An, Việt Nam","m":"https://maps.app.goo.gl/ZyftTrtrUTZQQcri9"},
{"n":"Giá Rai","r":"BẠC LIÊU","a":"Giá Rai, Bạc Liêu","la":9.2354801,"lo":105.4469317,"pc":"6CPW+3W Giá Rai, Bạc Liêu, Việt Nam","m":"https://maps.app.goo.gl/8SRAGTseX67AwHbBA"},
{"n":"Bạc Liêu","r":"BẠC LIÊU","a":"179 Trần Phú, Bạc Liêu","la":9.2911798,"lo":105.7190057,"pc":"7PRC+FJ Bạc Liêu, Bạc Liêu, Việt Nam","m":"https://maps.app.goo.gl/cEhZhkgeRb9qxNC58"},
{"n":"Phước Long","r":"BẠC LIÊU","a":"Phước Long, Bạc Liêu","la":9.43318,"lo":105.4618296,"pc":"CFM7+7Q6 Phước Long, Bạc Liêu, Việt Nam","m":"https://maps.app.goo.gl/kNPg4PNLR8r5Snmm7"},
{"n":"Cà Mau","r":"CÀ MAU","a":"183D Nguyễn Tất Thành, Lý Văn Lâm, Cà Mau","la":9.1699739,"lo":105.1283017,"pc":"549W+XG Lý Văn Lâm, Cà Mau, Việt Nam","m":"https://maps.app.goo.gl/VBCHc4ubfuu3PfP37"},
{"n":"Cái Côn","r":"SÓC TRĂNG","a":"An Lạc Thôn, Kế Sách, Sóc Trăng","la":9.9283744,"lo":105.8932036,"pc":"WVGW+R6 An Lạc Thôn, Sóc Trăng, Việt Nam","m":"https://maps.app.goo.gl/2Yhg5ACHuaKBuUwV6"},
{"n":"Huế","r":"THÀNH PHỐ HUẾ","a":"234 Đinh Tiên Hoàng, Phú Xuân, Huế","la":16.477151,"lo":107.5760317,"pc":"FHGH+VC Phú Xuân, Huế, Việt Nam","m":"https://maps.app.goo.gl/EHy23hpw3rBTd3zz7"},
{"n":"Tri Tôn","r":"AN GIANG","a":"25 Trần Hưng Đạo, Thị trấn Tri Tôn, An Giang","la":10.4280625,"lo":105.0020625,"pc":"C2H2+6RC Tri Tôn, An Giang, Việt Nam","m":"https://www.google.com/maps/search/?api=1&query=10.428072898860234,105.00201612859364"},
{"n":"Sóc Xoài","r":"KIÊN GIANG","a":"487 QL80, Tổ 13, Ấp Thị Tứ, Xã Mỹ Thuận, Tỉnh An Giang","la":10.1201875,"lo":105.0184375,"pc":"42C9+39C Mỹ Thuận, Kiên Giang, Việt Nam","m":"https://www.google.com/maps/search/?api=1&query=10.120190620422363,105.01837921142578"},
{"n":"Bình Đại","r":"BẾN TRE","a":"35/C Khu Phố 3, Bình Đại (Bến Tre cũ)","la":10.1909375,"lo":106.6915625,"pc":"5MRR+9J2 Bình Đại, Bến Tre, Việt Nam","m":"https://maps.app.goo.gl/4nxUQBxVa6mNbiPP6"},
{"n":"Long Mỹ","r":"HẬU GIANG","a":"Số 1, Đường 30 Tháng 4, Ấp 6, Thị Trấn Long Mỹ, Huyện Long Mỹ, Hậu Giang (cũ)","la":9.6840625,"lo":105.5751875,"pc":"MHMG+J3H Long Mỹ, Hậu Giang, Việt Nam","m":"https://maps.app.goo.gl/hp5uXsCzcHoCaQ4x6"},
{"n":"Trần Đề","r":"SÓC TRĂNG","a":"Đường Nam Sông Hậu, Đầu Giồng, Trần Đề (Sóc Trăng cũ - cách bến xe Phương Trang 200 m)","la":9.5156875,"lo":106.1941875,"pc":"G58V+7M6 Trần Đề, Cần Thơ, Việt Nam","m":"https://www.google.com/maps/search/?api=1&query=9.51566219329834,106.19415283203125"},
{"n":"Lê Đình Dương","r":"ĐÀ NẴNG","a":"132 Lê Đình Dương, Hải Châu, Đà Nẵng","la":16.0623125,"lo":108.2175625,"pc":"3669+W2F, 132 Lê Đình Dương, Hải Châu, Đà Nẵng 550000, Việt Nam","m":"https://maps.app.goo.gl/org1cKsivyTAhZ836"},
{"n":"Ninh Tốn","r":"ĐÀ NẴNG","a":"22 Ninh Tốn, Liên Chiểu, Đà Nẵng","la":16.0691875,"lo":108.1461875,"pc":"349W+MF6 Liên Chiểu, Đà Nẵng, Việt Nam","m":"https://maps.app.goo.gl/PAnxXzxs3ycTyTg18"},
{"n":"Núi Thành","r":"ĐÀ NẴNG","a":"456 Núi Thành, Hòa Cường, Đà Nẵng","la":16.0361875,"lo":108.2221875,"pc":"26PC+FV5 Hòa Cường, Đà Nẵng, Việt Nam","m":"https://maps.app.goo.gl/pYZSPty845A3LWzm6"},
{"n":"Bến Nghé","r":"THÀNH PHỐ HUẾ","a":"66 Bến Nghé, Tổ 9, Thuận Hóa, Huế","la":16.4644375,"lo":107.5945625,"pc":"FH7V+QRR Thuận Hóa, Huế, Việt Nam","m":"https://maps.app.goo.gl/YGRs3ioft16nT7s96"},
{"n":"Mỹ Xuyên","r":"SÓC TRĂNG","a":"251 Lê Hồng Phong, Mỹ Xuyên (Sóc Trăng cũ)","la":9.5576875,"lo":105.9816875,"pc":"HX5J+3M9 Mỹ Xuyên, Sóc Trăng, Việt Nam","m":"https://www.google.com/maps/search/?api=1&query=9.557666778564453,105.98173522949219"},
{"n":"Phú Lộc","r":"SÓC TRĂNG","a":"250 QL61B, Phú Lộc, Thạnh Trị (Sóc Trăng cũ)","la":9.4328125,"lo":105.7443125,"pc":"CPMV+4PP Phú Lộc, Sóc Trăng, Việt Nam","m":"https://maps.app.goo.gl/z947u8ZMTApdcsKR8"},
{"n":"Càng Long","r":"TRÀ VINH","a":"184A Mỹ Trường, Mỹ Cẩm, Càng Long (Trà Vinh cũ)","la":10.0024375,"lo":106.2054375,"pc":"2624+X5 Càng Long, Trà Vinh, Việt Nam","m":"https://maps.app.goo.gl/Pm3647iRfYH6pqri6"},
{"n":"Cầu Kè","r":"TRÀ VINH","a":"216 Đường 30/4, Khóm 6, Thị trấn Cầu Kè (Trà Vinh cũ)","la":9.8683125,"lo":106.0584375,"pc":"V395+899 Cầu Kè, Trà Vinh, Việt Nam","m":"https://maps.app.goo.gl/su9WLx5i77z3m7RU8"}
];

const REGION_REFERENCE = {
  "AN GIANG":[10.50,105.30],
  "BẠC LIÊU":[9.30,105.60],
  "BẾN TRE":[10.20,106.40],
  "CÀ MAU":[9.18,105.15],
  "CẦN THƠ":[10.03,105.78],
  "ĐÀ NẴNG":[16.05,108.20],
  "HẬU GIANG":[9.78,105.47],
  "KIÊN GIANG":[10.00,105.10],
  "LONG AN":[10.70,106.45],
  "SÓC TRĂNG":[9.60,105.98],
  "THÀNH PHỐ HUẾ":[16.47,107.58],
  "TIỀN GIANG":[10.36,106.36],
  "TRÀ VINH":[9.93,106.34],
  "VĨNH LONG":[10.24,105.96],
  "ĐỒNG THÁP":[10.45,105.65]
};
const OLC = new OpenLocationCode();

export function resolveStorePoint(store) {
  try {
    const code = store.pc.trim().split(/\s+/)[0].toUpperCase();
    const ref = REGION_REFERENCE[store.r];
    if (!ref) throw new Error("Thiếu điểm tham chiếu khu vực");
    const fullCode = OLC.isFull(code) ? code : OLC.recoverNearest(code, ref[0], ref[1]);
    const area = OLC.decode(fullCode);
    const lat = area.latitudeCenter;
    const lon = area.longitudeCenter;
    if (lat < 8 || lat > 24 || lon < 100 || lon > 115) throw new Error("Plus Code ngoài Việt Nam");
    return { lat, lon, source: "plus_code" };
  } catch (error) {
    return { lat: store.la, lon: store.lo, source: "legacy" };
  }
}

export function storeId(store) {
  return (store.n + "-" + store.r)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const ACTIVE_WEATHER_STORES = WEATHER_STORES
  .filter((store) => !store.h)
  .map((store) => ({ ...store, id: storeId(store), point: resolveStorePoint(store) }));

