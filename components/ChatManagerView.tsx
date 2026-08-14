"use client";

import { useState } from "react";
import ChatBox, { type ChatMessage } from "./ChatBox";
import { chuanHoaMaNV } from "@/lib/data";

interface NhanVien {
  maNhanVien: string;
  hoTen: string;
}

export default function ChatManagerView({
  employees,
  groupMessages,
  privateMessagesByEmployee,
}: {
  employees: NhanVien[];
  groupMessages: ChatMessage[];
  privateMessagesByEmployee: Record<string, ChatMessage[]>;
}) {
  const [tab, setTab] = useState<string>("nhom");

  const tabs = [{ key: "nhom", label: "Nhóm chung" }, ...employees.map((nv) => ({
    key: chuanHoaMaNV(nv.maNhanVien),
    label: nv.hoTen,
  }))];

  const activeEmployee = employees.find((nv) => chuanHoaMaNV(nv.maNhanVien) === tab);

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              t.key === tab
                ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                : "rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === "nhom" ? (
          <ChatBox
            messages={groupMessages}
            loai="nhom"
            currentSenderCode="QL"
            emptyLabel="Chưa có tin nhắn nào trong nhóm."
          />
        ) : (
          <ChatBox
            messages={privateMessagesByEmployee[tab] ?? []}
            loai="rieng"
            manvNhan={tab}
            tennvNhan={activeEmployee?.hoTen}
            currentSenderCode="QL"
            emptyLabel={`Chưa có tin nhắn riêng với ${activeEmployee?.hoTen ?? ""}.`}
          />
        )}
      </div>
    </div>
  );
}
