"use client"

import { Minus, Plus } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DispatchReadyProduct } from "@/features/products/validation"
import { getInitials } from "@/lib/utils"
import { useProductCard } from "../hooks/use-product-card"

interface Props {
  product: DispatchReadyProduct
}

export default function ProductCard({ product }: Props) {
  const {
    quantity,
    dispatchUom,
    inputValue,
    setInputValue,
    inputRef,
    commitInput,
    isLowStock,
    isOutOfStock,
    isAtMax,
    incrementQuantity,
    decrementQuantity,
    setDispatchUom,
  } = useProductCard(product)

  return (
    <Card className="relative w-full max-w-sm gap-0 pt-0 pb-4">
      <div className="relative w-full overflow-hidden max-h-32 aspect-4/3 bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            loading="eager"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center text-lg font-medium size-full text-muted-foreground">
            {getInitials(product.name)}
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        {isLowStock ? (
          <CardAction>
            <Badge variant="destructive" className="w-fit">
              Low Stock
            </Badge>
          </CardAction>
        ) : null}
        <CardTitle>{product.name}</CardTitle>
        <CardDescription>
          <h5 className="type-sm">{product.skuCode}</h5>
          <p className="type-base text-foreground">
            {product.currentQuantity}{" "}
            <span>
              {product.baseUom}
              {product.currentQuantity !== 1 ? "s" : ""}
            </span>
          </p>
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-2 px-4 pt-0">
        <ButtonGroup role="group" className="w-full">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-r-none"
            onClick={decrementQuantity}
            disabled={quantity === 0 || isOutOfStock}
          >
            <Minus />
          </Button>

          <Input
            ref={inputRef}
            type="number"
            className="text-center bg-background type-base tabular-nums"
            value={inputValue}
            min={0}
            max={product.currentQuantity}
            step={product.category === "twines" ? 0.01 : 1}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={() => commitInput(inputValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                inputRef.current?.blur()
              }
            }}
            disabled={isOutOfStock}
            aria-invalid={isAtMax || undefined}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-l-none"
            onClick={incrementQuantity}
            disabled={isAtMax || isOutOfStock}
          >
            <Plus />
          </Button>
        </ButtonGroup>

        {product.category === "twines" ? (
          <ToggleGroup
            type="single"
            value={dispatchUom === "kilo" ? "kilo" : "roll"}
            onValueChange={(value) => {
              if (value === "roll" || value === "kilo") {
                setDispatchUom(value)
              }
            }}
            variant="outline"
            spacing={0}
            className="w-full"
          >
            <ToggleGroupItem
              value="roll"
              className="flex-1 text-xs font-medium data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
            >
              Roll
            </ToggleGroupItem>
            <ToggleGroupItem
              value="kilo"
              className="flex-1 text-xs font-medium data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
            >
              Kg
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
      </CardFooter>
    </Card>
  )
}
