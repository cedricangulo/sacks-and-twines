"use client"

import { MinusIcon, PlusIcon } from "@phosphor-icons/react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { DispatchReadyProduct } from "@/features/products/validation"
import { formatNumber } from "@/lib/formatters"
import { getInitials } from "@/lib/utils"
import { useProductCard } from "../hooks/use-product-card"

interface Props {
  product: DispatchReadyProduct
}

// Card displaying a product for dispatch selection with quantity controls.
export default function ProductCard({ product }: Props) {
  const {
    quantity,
    inputValue,
    inputRef,
    isLowStock,
    isOutOfStock,
    isAtMax,
    setInputValue,
    commitInput,
    incrementQuantity,
    decrementQuantity,
  } = useProductCard(product)

  return (
    <Card className="relative w-full max-w-sm gap-0 pt-0 pb-4 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.04),0px_2px_8px_0px_rgba(0,0,0,0.06)]">
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
          <div className="flex items-center justify-center type-h4 font-medium size-full text-muted-foreground">
            {getInitials(product.name)}
          </div>
        )}
        <div className="absolute top-4 left-4">
          {isLowStock ? (
            <Badge variant="warning">Low Stock</Badge>
          ) : isOutOfStock ? (
            <Badge variant="destructive">Out of Stock</Badge>
          ) : null}
        </div>
      </div>
      <CardHeader className="p-4 gap-0!">
        <CardTitle
          className="text-muted-foreground line-clamp-1"
          title={product.name}
        >
          {product.name}
        </CardTitle>
        <CardDescription>
          {/* <h5 className="type-sm">{product.skuCode}</h5> */}
          <p className="type-body-default text-foreground">
            {formatNumber(product.currentQuantity)}{" "}
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
            aria-label="Decrease quantity"
            type="button"
            variant="outline"
            size="icon"
            data-cuelume-toggle="toggle"
            onClick={decrementQuantity}
            disabled={quantity === 0 || isOutOfStock}
          >
            <MinusIcon weight="bold" />
          </Button>

          <Input
            ref={inputRef}
            type="number"
            className="text-center bg-background type-body-default tabular-nums"
            value={inputValue}
            min={0}
            max={product.currentQuantity}
            step={1}
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
            aria-label="Increase quantity"
            type="button"
            variant="outline"
            size="icon"
            data-cuelume-toggle="toggle"
            onClick={incrementQuantity}
            disabled={isAtMax || isOutOfStock}
          >
            <PlusIcon weight="bold" />
          </Button>
        </ButtonGroup>
      </CardFooter>
    </Card>
  )
}
