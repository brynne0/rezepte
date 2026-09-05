import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  InputGroupText,
} from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import { Toaster, toast } from "@/components/ui/toast";
import { SearchIcon, MailIcon, ImageIcon } from "lucide-react";

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-8">
      <h2 className="font-heading text-lg font-medium">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function ShowcasePage() {
  const [radioValue, setRadioValue] = useState("one");
  const [dropdownRadio, setDropdownRadio] = useState("light");
  const [checked, setChecked] = useState(true);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 text-left">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">
          Component Showcase
        </h1>
        <p className="text-sm text-muted-foreground">
          Temporary page for reviewing shadcn components against the theme. Not
          linked from navigation — visit /showcase directly.
        </p>
      </header>

      <Section title="Buttons">
        <Button>Default</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
        <Button variant="text">Text</Button>
        <Button variant="text" aria-pressed>
          Text selected
        </Button>
        <Button disabled>Disabled</Button>
      </Section>

      <Section title="Button sizes">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="default">Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Search">
          <SearchIcon />
        </Button>
      </Section>

      <Section title="Card">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Recipe title</CardTitle>
            <CardDescription>
              A short description of the recipe goes here.
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                ⋮
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Card body content, e.g. ingredients or steps preview.
            </p>
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
          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              This is a default informational alert.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              This is a destructive alert with an action.
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
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>

      <Section title="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline">Open menu</Button>}
          />
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Duplicate</DropdownMenuItem>
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
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Inputs">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Input placeholder="Recipe name" />
          <Input placeholder="Disabled" disabled />
          <Textarea placeholder="Instructions" />
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search recipes" />
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
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>https://</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput placeholder="example.com" />
          </InputGroup>
        </div>
      </Section>

      <Section title="Select">
        <Select defaultValue="breakfast">
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Meal type</SelectLabel>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              <SelectItem value="dessert">Dessert</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Radio group">
        <RadioGroup
          value={radioValue}
          onValueChange={setRadioValue}
          className="max-w-xs"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="one" /> Option one
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="two" /> Option two
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="three" /> Option three
          </label>
        </RadioGroup>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="ingredients" className="w-full max-w-md">
          <TabsList>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="ingredients">
            Flour, sugar, eggs, butter.
          </TabsContent>
          <TabsContent value="steps">Mix, bake, cool, serve.</TabsContent>
          <TabsContent value="notes">Tastes best fresh.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Toggle / toggle group">
        <Toggle aria-label="Toggle bold">B</Toggle>
        <Toggle variant="outline" aria-label="Toggle italic">
          I
        </Toggle>
        <ToggleGroup type="single" defaultValue="grid" variant="outline">
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <ImageIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            ☰
          </ToggleGroupItem>
        </ToggleGroup>
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

      <Section title="Empty state">
        <Empty className="w-full border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
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

export default ShowcasePage;
