import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import { Toaster, toast } from "@/components/ui/toast";
import Pagination from "@/components/Pagination/Pagination";
import {
  SearchIcon,
  MailIcon,
  ArrowLeft,
  Trash2,
  Link,
  User,
} from "lucide-react";

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-8">
      <h2 className="font-heading text-lg font-medium">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function Showcase() {
  const [dropdownRadio, setDropdownRadio] = useState("light");
  const [checked, setChecked] = useState(true);
  const [ingredientChecked, setIngredientChecked] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [language, setLanguage] = useState(["en"]);
  const [paginationPage, setPaginationPage] = useState(1);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 text-left">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">
          Component Showcase
        </h1>
        <p className="text-sm text-muted-foreground">
          Temporary page for reviewing components actually used across the app
          against the theme. Not linked from navigation — visit /showcase
          directly.
        </p>
      </header>

      <Section title="Buttons">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="dashed">Dashed</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="ghost-destructive">Ghost destructive</Button>
        <Button variant="link">Link</Button>
        <Button variant="text">Text</Button>
        <Button variant="text" aria-pressed>
          Text selected
        </Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Button sizes & icon buttons">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Go back">
                <ArrowLeft />
              </Button>
            }
          />
          <TooltipContent>Back (as used in page headers)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost-destructive"
                size="icon-sm"
                aria-label="Delete"
              >
                <Trash2 size={16} />
              </Button>
            }
          />
          <TooltipContent>Delete row (form rows)</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Button group">
        <ButtonGroup>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="dashed" size="icon-lg" aria-label="Copy">
                  <ArrowLeft className="rotate-180" />
                </Button>
              }
            />
            <TooltipContent>
              Grouped icon actions (recipe header)
            </TooltipContent>
          </Tooltip>
          <Button variant="dashed" size="icon-lg" aria-label="Edit">
            <SearchIcon />
          </Button>
        </ButtonGroup>
      </Section>

      <Section title="Badges">
        <Badge size="lg">Default Large</Badge>
        <Badge variant="secondary" size="lg">
          Secondary Large
        </Badge>
        <Badge variant="outline" size="lg">
          Outline Large
        </Badge>
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="ghost">Ghost</Badge>
        <Badge variant="link">Link</Badge>
      </Section>

      <Section title="Card">
        <Card className="w-full max-w-sm py-0">
          <CardHeader className="py-2">
            <CardTitle className="text-xs font-semibold uppercase">
              Recipe title
            </CardTitle>
            <CardAction className="row-span-1 self-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Open source link"
                    >
                      <Link size={16} />
                    </Button>
                  }
                />
                <TooltipContent>Open recipe source link</TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <AspectRatio
            ratio={3 / 2}
            className="mx-2 mb-2 overflow-hidden rounded-lg"
          >
            <Skeleton className="absolute inset-0 rounded-lg" />
          </AspectRatio>
        </Card>

        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Settings card</CardTitle>
            <CardDescription>
              A card used outside the recipe grid, e.g. settings sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Card body content.</p>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Save</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Alerts">
        <div className="flex w-full flex-col gap-3">
          <Alert variant="destructive">
            <AlertDescription>
              This is the only alert pattern actually used in the app — a
              destructive alert for surfacing form/auth errors.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              Destructive alert with a title and a retry action.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm">
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </div>
      </Section>

      <Section title="Alert dialog">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive">Delete recipe</Button>}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this recipe?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                recipe.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>

      <Section title="Dialog & Popover">
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline">Open dialog</Button>}
          />
          <DialogContent className="flex max-h-[80vh] flex-col gap-2.5 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Friends</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Mobile presentation of panels like FriendsPanel.
            </p>
          </DialogContent>
        </Dialog>
        <Popover>
          <PopoverTrigger
            render={<Button variant="outline">Open popover</Button>}
          />
          <PopoverContent align="end" className="w-72">
            <p className="text-sm text-muted-foreground">
              Desktop presentation of the same panel content.
            </p>
          </PopoverContent>
        </Popover>
      </Section>

      <Section title="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline">Open menu</Button>}
          />
          <DropdownMenuContent align="center">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={checked}
              onCheckedChange={setChecked}
            >
              Show images
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={dropdownRadio}
              onValueChange={setDropdownRadio}
            >
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Form fields">
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Field>
            <FieldLabel>Ingredients</FieldLabel>
            <Input placeholder="Ingredient name" />
            <FieldError>This field is required.</FieldError>
          </Field>
          <FieldGroup className="gap-2">
            <Input placeholder="Recipe name" />
            <Input placeholder="Disabled" disabled />
            <Textarea placeholder="Instructions" />
          </FieldGroup>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search friends" />
          </InputGroup>
          <InputGroup>
            <InputGroupAddon>
              <MailIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="you@example.com" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton>Send</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <Combobox>
            <ComboboxInput placeholder="Search units..." />
            <ComboboxContent>
              <ComboboxEmpty>No results found.</ComboboxEmpty>
              <ComboboxList>
                <ComboboxItem value="g">g</ComboboxItem>
                <ComboboxItem value="ml">ml</ComboboxItem>
                <ComboboxItem value="cup">cup</ComboboxItem>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={ingredientChecked}
              onCheckedChange={setIngredientChecked}
              id="showcase-ingredient-checkbox"
            />
            2 cups flour
          </label>
          <Label htmlFor="showcase-switch" className="justify-between">
            <span className="flex flex-col">
              <span className="font-medium">Friends can view images</span>
              <span className="text-sm text-muted-foreground">
                Settings toggle pattern (Label wrapping a Switch)
              </span>
            </span>
            <Switch
              id="showcase-switch"
              checked={switchOn}
              onCheckedChange={setSwitchOn}
            />
          </Label>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="profile" className="w-full max-w-md">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">
              Profile
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-1">
              Categories
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile">Profile settings content.</TabsContent>
          <TabsContent value="categories">
            Category management content.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Toggle group">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium">Preferred language</span>
          <ToggleGroup
            variant="outline"
            value={language}
            onValueChange={(value) => value[0] && setLanguage(value)}
          >
            <ToggleGroupItem value="en">EN</ToggleGroupItem>
            <ToggleGroupItem value="de">DE</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </Section>

      <Section title="Item">
        <Item
          variant="outline"
          size="sm"
          className="w-full max-w-sm items-start border-primary/50 bg-muted/20"
        >
          <ItemContent>
            <ItemTitle className="text-base">Black beans</ItemTitle>
            <ItemDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>8h soak</span>
              <span>45min cook</span>
            </ItemDescription>
            <ItemDescription className="inline-flex items-center gap-1">
              250g dry → 600g cooked
              <Badge variant="outline" className="ml-1">
                x2.4
              </Badge>
            </ItemDescription>
          </ItemContent>
        </Item>
      </Section>

      <Section title="Table">
        <Table className="max-w-md">
          <TableHeader>
            <TableRow>
              <TableHead />
              <TableHead className="text-right">Per serving</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="pr-8">Calories</TableCell>
              <TableCell className="text-right font-medium">320 kcal</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="pr-8">Protein</TableCell>
              <TableCell className="text-right font-medium">12 g</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Accordion">
        <Accordion
          defaultValue={["nutrition-info"]}
          className="w-full max-w-md"
        >
          <AccordionItem value="nutrition-info">
            <AccordionTrigger>
              <h3>Nutritional info:</h3>
            </AccordionTrigger>
            <AccordionContent>
              Collapsible section used for the recipe nutrition panel.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Spinner">
        <Spinner />
        <Spinner className="size-6" />
      </Section>

      <Section title="Scroll area">
        <ScrollArea className="h-32 w-full max-w-sm rounded-lg border border-border p-3">
          <p className="text-sm">
            Long scrollable content goes here. Long scrollable content goes
            here. Long scrollable content goes here. Long scrollable content
            goes here. Long scrollable content goes here. Long scrollable
            content goes here.
          </p>
        </ScrollArea>
      </Section>

      <Section title="Separator">
        <div className="flex w-full max-w-sm flex-col gap-2">
          <span className="text-sm">Friends list</span>
          <Separator />
          <span className="text-sm">Pending requests</span>
        </div>
      </Section>

      <Section title="Pagination">
        <Pagination
          currentPage={paginationPage}
          totalPages={5}
          onPageChange={setPaginationPage}
        />
      </Section>

      <Section title="Empty state">
        <Empty className="w-full border">
          <EmptyHeader>
            <EmptyMedia>
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>No recipes found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search or filters.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">Clear filters</Button>
          </EmptyContent>
        </Empty>
      </Section>

      <Section title="Toast">
        <Button
          variant="outline"
          onClick={() =>
            toast.add({
              title: "Recipe saved",
              description: "Your changes have been saved.",
              type: "success",
            })
          }
        >
          Show success toast
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.add({
              title: "Something went wrong",
              description: "Could not save the recipe.",
              type: "error",
            })
          }
        >
          Show error toast
        </Button>
        <Toaster />
      </Section>
    </div>
  );
}

export default Showcase;
