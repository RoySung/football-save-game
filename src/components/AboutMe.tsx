import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function AboutMe() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isExpanded && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      setIsExpanded(true);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={() => !isExpanded && setIsExpanded(true)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isExpanded ? -1 : 0}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? undefined : t("aboutMe.title")}
      className={`absolute right-4 bottom-4 pointer-events-auto z-20 flex items-center bg-[var(--color-surface)] border-2 border-[var(--stroke-color)] shadow-[0_4px_0_var(--stroke-color)] transition-all duration-300 ease-out select-none cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
        isExpanded
          ? "p-2.5 w-[240px] h-[64px]"
          : "w-8 h-8 justify-center hover:translate-y-[-2px] hover:shadow-[0_6px_0_var(--stroke-color)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--stroke-color)]"
      }`}
    >
      {/* Info Icon (visible when collapsed) */}
      <svg
        viewBox="0 0 24 24"
        className={`w-5 h-5 fill-current text-[var(--color-text)] absolute left-[4px] top-[4px] transition-all duration-300 ease-out ${
          isExpanded
            ? "opacity-0 scale-75 pointer-events-none"
            : "opacity-100 scale-100"
        }`}
        aria-hidden="true"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>

      {/* Expanded Content */}
      <div
        className={`flex items-center transition-all duration-300 overflow-hidden ${
          isExpanded ? "opacity-100 w-full" : "w-0 opacity-0"
        }`}
      >
        {/* Avatar (inside expanded content) */}
        <img
          src="/assets/avatar.png"
          alt="Roy Sung Avatar"
          className="w-10 h-10 rounded-full border-2 border-[var(--stroke-color)] bg-white object-cover shadow-sm pointer-events-none"
        />

        {/* Name and links */}
        <div className="flex flex-col items-start ml-2.5 flex-1 min-w-0">
          <div className="flex justify-between items-center w-full">
            <span className="text-[11px] font-black text-[var(--color-text)] tracking-wider truncate">
              {t("aboutMe.title")}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="text-[var(--color-text-light)] hover:text-[var(--color-text)] font-black text-sm px-1 leading-none cursor-pointer"
              aria-label={t("aboutMe.close")}
            >
              ✕
            </button>
          </div>
          <div className="flex gap-1.5 mt-1 pb-1">
            <a
              href="https://roysung.notion.site/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-text)] border border-[var(--stroke-color)] rounded-full text-[9px] font-black hover:bg-[var(--color-primary)] hover:text-white transition-colors duration-150 shadow-[0_1.5px_0_var(--stroke-color)] active:translate-y-[1px] active:shadow-none whitespace-nowrap"
            >
              Notion
            </a>
            <a
              href="https://github.com/RoySung"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-0.5 bg-[var(--color-secondary-light)] text-[var(--color-text)] border border-[var(--stroke-color)] rounded-full text-[9px] font-black hover:bg-[var(--color-secondary)] hover:text-white transition-colors duration-150 shadow-[0_1.5px_0_var(--stroke-color)] active:translate-y-[1px] active:shadow-none whitespace-nowrap"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
