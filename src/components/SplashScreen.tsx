import Image from "next/image";

export default function SplashScreen() {
  return (
    // משתמשים ב-fixed ו-z-index גבוה כדי שזה תמיד יכסה את כל המסך, לא משנה איפה שמים את זה
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <div className="relative flex items-center justify-center">
        {/* הילה זוהרת ופועמת מאחורי הלוגו */}
        <div className="absolute w-32 h-32 bg-tumba-600/20 rounded-full blur-2xl animate-pulse" />
        
        {/* הלוגו עצמו (התמונה מה-public) */}
        <Image
          src="/icons/icon-192x192.png" 
          alt="TumbaNet Loading"
          width={96}
          height={96}
          // פולס עדין וצללית כדי שזה ייראה חי
          className="relative z-10 animate-pulse drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          priority // חשוב מאוד! אומר ל-Next.js לטעון את התמונה הזו מיד ולא לחכות
        />
      </div>
    </div>
  );
}