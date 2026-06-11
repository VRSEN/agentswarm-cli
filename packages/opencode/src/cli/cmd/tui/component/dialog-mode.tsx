import { useLocal, type ProductMode } from "@tui/context/local"
import { useDialog } from "@tui/ui/dialog"
import { DialogSelect, type DialogSelectOption } from "@tui/ui/dialog-select"

export function DialogMode() {
  const local = useLocal()
  const dialog = useDialog()

  const options: DialogSelectOption<ProductMode>[] = [
    {
      value: "build",
      title: "Build",
      description: "Build or fix swarms and agents",
    },
    {
      value: "plan",
      title: "Plan",
      description: "Plan work before building",
    },
    {
      value: "run",
      title: "Run",
      description: "Run the connected swarm",
    },
  ]

  return (
    <DialogSelect
      title="Select mode"
      current={local.product.current()}
      options={options}
      onSelect={(option) => {
        void local.product.set(option.value).then(
          () => dialog.clear(),
          () => dialog.clear(),
        )
      }}
    />
  )
}
