import "./StickerCard.css";

import { Minus, Plus } from "lucide-react";

function StickerCard({ sticker, quantity = 0, onChange }) {
  const isObtained = quantity > 0;
  const isDuplicate = quantity > 1;

  function handleDecrease() {
    if (quantity <= 0) {
      return;
    }

    onChange(sticker.id, quantity - 1);
  }

  function handleIncrease() {
    onChange(sticker.id, quantity + 1);
  }

  return (
    <article
      className={`sticker-card ${!isObtained ? "sticker-card-missing" : ""} ${
        isDuplicate ? "sticker-card-duplicate" : ""
      }`}
    >
      <div className="sticker-card-number">
        #{String(sticker.sticker_number).padStart(3, "0")}
      </div>

      <div className="sticker-card-name">{sticker.name}</div>

      <div className="sticker-card-status">
        {!isObtained && "NOT OBTAINED"}

        {isObtained && !isDuplicate && "OBTAINED"}

        {isDuplicate && `REPEATED × ${quantity - 1}`}
      </div>

      <div className="sticker-card-controls">
        <button
          type="button"
          className="sticker-card-control"
          onClick={handleDecrease}
          disabled={quantity <= 0}
          aria-label="Decrease quantity"
        >
          <Minus size={14} />
        </button>

        <span className="sticker-card-quantity">{quantity}</span>

        <button
          type="button"
          className="sticker-card-control"
          onClick={handleIncrease}
          aria-label="Increase quantity"
        >
          <Plus size={14} />
        </button>
      </div>
    </article>
  );
}

export default StickerCard;
