# How public/images/hasitha-hero.webp and hero-comma.png were made from the original channel banner
# (public/images/yt-banner-hero.webp). Only needed if the photo is ever re-cut; the banner text itself is live HTML
# (src/components/landing/hero-banner.tsx).
from PIL import Image, ImageDraw, ImageFilter
src = Image.open("public/images/yt-banner-hero.webp").convert("RGB")
ImageDraw.Draw(src).rectangle((896, 48, 950, 200), fill=(20, 20, 20))   # the old red comma touches the crop's right edge
photo = src.crop((575, 30, 945, 329))                                   # bottom edge of the cut-out photo = y 329
photo = photo.resize((photo.width * 2, photo.height * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
photo.save("public/images/hasitha-hero.webp", "WEBP", quality=90, method=6)
