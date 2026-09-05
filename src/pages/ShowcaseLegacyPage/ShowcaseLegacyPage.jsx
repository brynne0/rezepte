import { useState } from "react";
import { SearchIcon, MailIcon, XIcon, PencilIcon, TrashIcon, EyeIcon } from "lucide-react";

function Section({ title, children }) {
  return (
    <section className="flex-column gap-xs" style={{ borderBottom: "1px solid var(--color-border-light)", paddingBottom: "2rem" }}>
      <h2>{title}</h2>
      <div className="flex-row" style={{ flexWrap: "wrap", alignItems: "flex-start", gap: "0.75rem" }}>
        {children}
      </div>
    </section>
  );
}

function ShowcaseLegacyPage() {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(false);

  return (
    <div className="flex-column gap-lg" style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem", textAlign: "left" }}>
      <header className="flex-column">
        <h1>Legacy Component Showcase</h1>
        <p className="small">
          Existing hand-rolled styling (buttons.css, inputs.css, modal.css, typography.css,
          containers.css) — compare against /showcase while migrating.
        </p>
      </header>

      <Section title="Buttons">
        <button className="btn btn-action btn-primary">Primary</button>
        <button className="btn btn-action btn-secondary">Secondary</button>
        <button className="btn btn-tertiary">Tertiary</button>
        <button className="btn btn-action btn-danger">Danger</button>
        <button className="btn btn-action btn-primary" disabled>
          Disabled
        </button>
      </Section>

      <Section title="Standard & section buttons">
        <button className="btn btn-standard" style={{ width: "auto" }}>
          Standard
        </button>
        <button className="btn-section">Section button</button>
      </Section>

      <Section title="Icon buttons">
        <button className="btn-unstyled btn-icon btn-icon-neutral" aria-label="Edit">
          <PencilIcon />
        </button>
        <button
          className={`btn-unstyled btn-icon btn-icon-neutral${selected ? " selected" : ""}`}
          onClick={() => setSelected((s) => !s)}
          aria-label="Toggle selected"
        >
          <PencilIcon />
        </button>
        <button className="btn-unstyled btn-icon btn-icon-green" aria-label="Confirm">
          <EyeIcon />
        </button>
        <button className="btn-unstyled btn-icon btn-icon-red" aria-label="Remove">
          <XIcon />
        </button>
        <button className="btn-unstyled btn-icon btn-icon-remove" aria-label="Remove">
          <TrashIcon />
        </button>
      </Section>

      <Section title="Cards">
        <div className="card" style={{ padding: "1.5rem", minWidth: "16rem", margin: 0 }}>
          <h3>Recipe title</h3>
          <p className="small">A short description of the recipe goes here.</p>
          <div className="action-buttons-end">
            <button className="btn btn-secondary">Cancel</button>
            <button className="btn btn-action btn-primary">Save</button>
          </div>
        </div>
      </Section>

      <Section title="Inputs">
        <div className="flex-column gap-xs" style={{ maxWidth: "20rem", width: "100%" }}>
          <input className="input input--full-width" placeholder="Recipe name" />
          <input className="input input--full-width" placeholder="Disabled" disabled />
          <textarea className="input input--full-width input--textarea" placeholder="Instructions" rows={3} />
          <input className="input input--full-width input--error" placeholder="Error state" />
          <div className="input-with-icon">
            <SearchIcon />
            <input className="input input--full-width" placeholder="Search recipes" />
          </div>
          <div className="input-with-icon">
            <MailIcon />
            <input className="input input--full-width" placeholder="you@example.com" />
          </div>
          <div className="floating-label-input">
            <input className="input input--full-width" placeholder=" " />
            <label>Floating label</label>
          </div>
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex-column gap-xs" style={{ width: "100%" }}>
          <h1 className="forta-red">Heading forta-red</h1>
          <h1 className="forta">Heading forta</h1>
          <h2 className="forta">Subheading forta</h2>
          <p className="small">Small body text</p>
          <p className="bold-small">Bold small text</p>
          <p className="grey-small">Grey small text</p>
          <p className="red-small">Red small text</p>
          <p className="error-message">Error message</p>
          <p className="error-message-small">Error message small</p>
          <span className="link">Link text</span>
        </div>
      </Section>

      <Section title="Notices">
        <div className="flex-column gap-xs" style={{ width: "100%" }}>
          <div className="warning-notice">This is a warning notice.</div>
          <div className="share-error-box">This is a share error box.</div>
        </div>
      </Section>

      <Section title="Modal">
        <button className="btn btn-action btn-primary" onClick={() => setShowModal(true)}>
          Open confirmation modal
        </button>
        {showModal && (
          <div className="confirmation-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="confirmation-modal-title">Delete this recipe?</h2>
              <p className="confirmation-modal-message">This action cannot be undone.</p>
              <p className="confirmation-modal-secondary-message">
                This will permanently delete the recipe.
              </p>
              <div className="action-buttons-end">
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-action btn-danger" onClick={() => setShowModal(false)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

export default ShowcaseLegacyPage;
