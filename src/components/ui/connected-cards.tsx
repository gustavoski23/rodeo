/* connected-cards — el radio group de tarjetas (Ark UI) pegado del prompt de
   Gus (flujo Suscripción), la variante "Cards" del demo con los datos por
   defecto que pidió: una MASTERCARD (••••4242) y una VISA (••••8888, la
   seleccionada). Adaptaciones declaradas:
   · sin "use client" (no es Next).
   · sin las clases dark:* del demo: estas tarjetas viven SIEMPRE sobre el
     panel blanco del overlay (scope sub-claro) — con el @custom-variant dark
     de RODEO activo en tema oscuro, esas clases las pintarían gris oscuro
     encima del panel blanco.
   · export nombrado ConnectedCards en lugar del default "Cards". */

import { RadioGroup } from "@ark-ui/react/radio-group";

export function ConnectedCards() {
  const options = [
    {
      value: "mastercard",
      label: "Mastercard",
      sublabel: "••••4242",
      description: "You can use this card with a label and a description.",
      icon: (
        <div className="w-8 h-6 bg-linear-to-r from-red-500 to-orange-500 rounded-sm flex items-center justify-center">
          <div className="w-3 h-3 bg-red-600 rounded-full opacity-80"></div>
          <div className="w-3 h-3 bg-orange-400 rounded-full -ml-1.5 opacity-80"></div>
        </div>
      ),
    },
    {
      value: "visa",
      label: "Visa",
      sublabel: "••••8888",
      description: "You can use this card with a label and a description.",
      icon: (
        <div className="w-8 h-6 bg-blue-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
          VISA
        </div>
      ),
    },
  ];

  return (
    <RadioGroup.Root className="flex flex-col space-y-3" defaultValue="visa">
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 hover:bg-gray-50 data-[state=checked]:border-blue-500 data-[state=checked]:bg-blue-50 transition-all duration-200"
        >
          {option.icon}

          <div className="flex-1">
            <RadioGroup.ItemText className="text-sm font-medium text-gray-900">
              {option.label}{" "}
              <span className="text-gray-500 font-normal">
                ({option.sublabel})
              </span>
            </RadioGroup.ItemText>
            <p className="text-xs text-gray-600 mt-1">
              {option.description}
            </p>
          </div>

          <RadioGroup.ItemControl className="group size-4 bg-white border-2 border-gray-300 rounded-full data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-hover:border-gray-400 data-focus:ring-2 data-focus:ring-blue-500/50 transition-all duration-200 flex items-center justify-center text-white mt-0.5">
            <svg
              width="6"
              height="6"
              viewBox="0 0 6 6"
              fill="currentcolor"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-0 group-data-[state=checked]:opacity-100 transition-opacity"
            >
              <circle cx="3" cy="3" r="3"></circle>
            </svg>
          </RadioGroup.ItemControl>

          <RadioGroup.ItemHiddenInput />
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
