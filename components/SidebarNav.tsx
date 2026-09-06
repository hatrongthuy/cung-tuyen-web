"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/allowlist";
import type { NavKey } from "./AppHeader";

const ROLE_LABEL: Record<Role, string> = {
  manager: "Quản lý nhóm",
  superior: "Cấp trên (ASM)",
  employee: "Trình dược viên",
};

export type NavLeaf = { key: NavKey; label: string; href: string; icon: string };
export type NavGroup = {
  group: string;
  label: string;
  icon: string;
  children: NavLeaf[];
};
export type NavEntry = NavLeaf | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return (e as NavGroup).children !== undefined;
}

export default function SidebarNav({
  hoTen,
  role,
  weekLabel,
  active,
  items,
  signOutAction,
}: {
  hoTen: string;
  role: Role;
  weekLabel?: string | null;
  active?: NavKey;
  items: NavEntry[];
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  // Nhóm nào đang chứa mục được chọn thì mở sẵn.
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const e of items) {
      if (isGroup(e) && e.children.some((c) => c.key === active)) {
        init[e.group] = true;
      }
    }
    return init;
  });

  // Khoá cuộn nền khi mở menu trên điện thoại.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const leafClass = (isActive: boolean) =>
    isActive
      ? "flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
      : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100";

  return (
    <>
      {/* Thanh trên cùng: nút mở menu + tiêu đề + đăng xuất */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {role === "manager" || role === "employee" ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Mở menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
              QUẢN LÝ PS PHÚ THỌ
            </h1>
            <p className="truncate text-xs text-slate-500">
              {hoTen} · {ROLE_LABEL[role]}
              {weekLabel ? ` · Tuần: ${weekLabel}` : ""}
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      {/* Lớp nền mờ khi mở menu */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      {/* Menu dạng thanh bên trượt từ trái */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">PS PHÚ THỌ</p>
            <p className="truncate text-xs text-slate-500">{hoTen}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((e) => {
            if (!isGroup(e)) {
              return (
                <Link
                  key={e.key}
                  href={e.href}
                  onClick={() => setOpen(false)}
                  className={leafClass(e.key === active)}
                >
                  <span className="w-5 text-center text-base leading-none">{e.icon}</span>
                  <span>{e.label}</span>
                </Link>
              );
            }
            const isOpen = !!expanded[e.group];
            const hasActive = e.children.some((c) => c.key === active);
            return (
              <div key={e.group}>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((s) => ({ ...s, [e.group]: !s[e.group] }))
                  }
                  className={
                    hasActive
                      ? "flex w-full items-center gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900"
                      : "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  }
                  aria-expanded={isOpen}
                >
                  <span className="w-5 text-center text-base leading-none">{e.icon}</span>
                  <span className="flex-1 text-left">{e.label}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                  >
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </button>
                {isOpen ? (
                  <div className="mt-1 space-y-1 pl-5">
                    {e.children.map((c) => (
                      <Link
                        key={c.key}
                        href={c.href}
                        onClick={() => setOpen(false)}
                        className={
                          c.key === active
                            ? "flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                            : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                        }
                      >
                        <span className="w-4 text-center text-sm leading-none">{c.icon}</span>
                        <span>{c.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
