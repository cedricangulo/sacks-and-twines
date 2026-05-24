"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

interface SupplierComboboxProps {
  suppliers: Array<{ id: string; name: string }>
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function SupplierCombobox({
  suppliers,
  value,
  onChange,
  disabled,
}: SupplierComboboxProps) {
  return (
    <Combobox
      value={value || null}
      onValueChange={(newValue) => onChange(newValue ?? "")}
      items={suppliers.map((s) => s.id)}
      itemToStringLabel={(id) => suppliers.find((s) => s.id === id)?.name ?? id}
      autoHighlight
    >
      <ComboboxInput placeholder="Select supplier" disabled={disabled} />
      <ComboboxContent>
        <ComboboxList>
          {(item) => {
            const s = suppliers.find((s) => s.id === item)
            return (
              <ComboboxItem key={item} value={item}>
                {s?.name}
              </ComboboxItem>
            )
          }}
        </ComboboxList>
        <ComboboxEmpty>No suppliers found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  )
}
