"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "@phosphor-icons/react";

interface ProfileMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ProfileMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProfileMenuItem[];
}

export function ProfileMenuModal({ isOpen, onClose, items }: ProfileMenuModalProps) {
  const handleItemClick = (onClick: () => void) => {
    onClick();
    onClose();
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
        </Transition.Child>

        {/* Modal Panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-sm bg-surface-800 border border-onsurface-950 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-onsurface-950">
                <Dialog.Title className="text-body text-white-900 font-medium">
                  Menu
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-white-700 hover:text-white-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                {items.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleItemClick(item.onClick)}
                    className={`flex items-center gap-5 w-full text-left px-5 py-3 text-body transition-colors ${
                      item.danger
                        ? "text-redhaze hover:bg-redhaze/10"
                        : "text-white-900 hover:bg-onsurface-900"
                    }`}
                  >
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

