import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countries, flagEmoji } from '@/lib/countries';

interface CountrySelectProps {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const CountrySelect = ({
  value,
  onChange,
  placeholder = 'Select country',
  className,
  id,
}: CountrySelectProps) => {
  const [open, setOpen] = useState(false);
  const selected = countries.find((c) => c.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-11 w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected && <span aria-hidden>{flagEmoji(selected.code)}</span>}
            <span className="truncate">{selected ? selected.name : placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code}`}
                  onSelect={() => {
                    onChange(c.name);
                    setOpen(false);
                  }}
                >
                  <span className="mr-2" aria-hidden>{flagEmoji(c.code)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4',
                      value === c.name ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CountrySelect;
