import React from "react";
import { Modal } from "./modal";

interface ConfirmProps {
  msg: string;
  onYes: () => void;
  onNo: () => void;
}

export function Confirm({ msg, onYes, onNo }: ConfirmProps) {
  return (
    <Modal
      title="تأكيد العملية"
      onClose={onNo}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onNo}>
            إلغاء
          </button>
          <button className="btn btn-danger" onClick={onYes}>
            تأكيد
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: "var(--text)" }}>{msg}</p>
    </Modal>
  );
}
