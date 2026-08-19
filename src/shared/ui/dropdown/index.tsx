"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
}

export function Dropdown({ trigger, items }: DropdownProps) {
  return (
    <Menu as="div" className="relative w-full">
      <Menu.Button as={Fragment}>
        <div className="w-full" suppressHydrationWarning>{trigger}</div>
      </Menu.Button>
      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 bottom-full mb-2 w-56 origin-bottom-left bg-surface-800 border border-onsurface-950 divide-y divide-white-500 focus:outline-none z-10 rounded-xl">
          <div className="py-1">
            {items.map((item, index) => (
              <Menu.Item key={index}>
                {({ active }) => (
                  <button
                    onClick={item.onClick}
                    className={`${
                      active ? "bg-onsurface-900" : ""
                    } ${
                      item.danger ? "text-redhaze" : "text-white-900"
                    } flex items-center gap-5 w-full text-left px-4 py-2 text-body`}
                  >
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    <span>{item.label}</span>
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

