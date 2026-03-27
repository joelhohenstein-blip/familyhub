import { useFamily } from '~/utils/familyContext';
import { FamilyLogoIcon } from './FamilyLogo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Check, Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { useNavigate } from 'react-router';

export function FamilySwitcher() {
  const { currentFamily, families, switchFamily, isLoaded } = useFamily();
  const navigate = useNavigate();

  if (!isLoaded || !currentFamily || families.length === 0) {
    return null;
  }

  const handleCreateFamily = () => {
    navigate('/dashboard/settings?tab=family');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start px-2 h-auto py-2"
        >
          <FamilyLogoIcon size="sm" className="mr-2" />
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-sm font-semibold truncate">
              {currentFamily.surname}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentFamily.role && `${currentFamily.role}`}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
          Your Families
        </DropdownMenuLabel>
        {families.length > 0 && <DropdownMenuSeparator />}
        
        {families.map((family) => (
          <DropdownMenuItem
            key={family.id}
            onClick={() => switchFamily(family.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-medium truncate">
                {family.surname}
              </span>
              {family.role && (
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {family.role}
                </span>
              )}
            </div>
            {family.id === currentFamily.id && (
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        {families.length > 0 && <DropdownMenuSeparator />}
        
        <DropdownMenuItem
          onClick={handleCreateFamily}
          className="text-blue-600 cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Family</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
